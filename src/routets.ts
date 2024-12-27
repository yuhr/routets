// SPDX-License-Identifier: MPL-2.0

import Router from "./Router.ts"
import { Command } from "https://deno.land/x/cliffy@v0.25.7/command/command.ts"
import { isPortAvailable, getAvailablePort } from "https://deno.land/x/port@1.0.0/mod.ts"
import { isAbsolute } from "https://jsr.io/@std/path/1.0.8/is_absolute.ts"
import { resolve } from "https://jsr.io/@std/path/1.0.8/resolve.ts"

const marker = ""

let configCwd: string | undefined = undefined
const tryFindConfigCwd = async (path: string) => {
	await Deno.stat(path)
	return path
}
try {
	configCwd = await tryFindConfigCwd("deno.jsonc")
} catch (error) {
	try {
		configCwd = await tryFindConfigCwd("deno.json")
	} catch (error) {
		/* empty */
	}
}

let importMapCwd: string | undefined = undefined
const tryFindImportMapCwd = async (path: string) => {
	const { importMap: importMapMaybe, imports, scopes } = JSON.parse(await Deno.readTextFile(path))
	if (typeof importMapMaybe === "string") return importMapMaybe
	else if (imports && scopes) return path
}
try {
	importMapCwd = await tryFindImportMapCwd("deno.jsonc")
} catch (error) {
	try {
		importMapCwd = await tryFindImportMapCwd("deno.json")
	} catch (error) {
		/* empty */
	}
}

if (import.meta.main && Deno.args[0] !== marker) {
	// Required to run in another process, because installed scripts don't support import maps out of the box.
	const argsConfig = configCwd ? ["--config", configCwd] : []
	const argsImportMap = importMapCwd ? ["--import-map", importMapCwd] : []
	const command = new Deno.Command(Deno.execPath(), {
		args: ["run", "-A", ...argsConfig, ...argsImportMap, import.meta.url, marker, ...Deno.args],
		...{ stdin: "piped", stdout: "piped", stderr: "piped" },
	})
	const process = command.spawn()
	Deno.stdin.readable.pipeTo(process.stdin)
	process.stdout.pipeTo(Deno.stdout.writable)
	process.stderr.pipeTo(Deno.stderr.writable)
	Deno.exit((await process.status).code)
} else {
	const [first, ...rest] = Deno.args
	const argsRaw = first === marker ? rest : Deno.args
	try {
		const { args, options } = await new Command()
			.name("routets")
			.usage("[root] [options]")
			.description(
				"A simple interface to use `routets` from command line. It searches routes for `<root>/**/*.<suffix>.{ts,tsx}`. When running without specifying `root`, the current working directory is implied.\n\nFurther documentation can be found at <https://github.com/yuhr/routets>.",
			)
			.arguments("[root:string]")
			.option(
				"--suffix <string>",
				"Specifies the route filename suffix. It cannot be empty, cannot contain slashes, cannot start or end with dots.",
				{ default: "route" },
			)
			.option(
				"--watch [...paths:string]",
				"Enables watching for file changes and reloading routes. Without paths, the same directory as `root` is implied.",
				{ default: true },
			)
			.option("--no-watch", "Disables watching.")
			.option(
				"--write [path:string]",
				"Enables generating the index module at the specified path, relative to `root`.",
				{ default: "serve.gen.ts" },
			)
			.option("--no-write", "Disables generating the index module.")
			.option(
				"--no-serve",
				"Disables serving. Useful when you only want to generate the index module.",
			)
			.option(
				"--import-map <string>",
				"Specifies a path to the import map JSON file to use while watching. If not specified, Deno's manifest file in the working directory is respected.",
			)
			.option("--hostname <hostname:string>", "Specifies the hostname to serve at.", {
				default: "0.0.0.0",
			})
			.option(
				"--port <port:number>",
				"Specifies the port to serve at. Defaulting to the first available port between 8000–65535. When a value is given but unavailable, it simply throws.",
			)
			.helpOption("--help", "Shows this help.", { prepend: false })
			.parse(argsRaw)

		const cwd = Deno.cwd()
		const [rootRaw = cwd, ...rest] = args
		if (rest.length) throw new Error(`Unexpected arguments: ${rest.join(" ")}`)
		const {
			suffix,
			write: writeRaw,
			watch: watchRaw,
			serve,
			importMap: importMapRaw,
			hostname,
			port: portSpecified,
		} = options

		const toAbsolute = (path: string) => (isAbsolute(path) ? path : resolve(cwd, path))

		const root = toAbsolute(rootRaw)
		const importMap =
			(importMapRaw && toAbsolute(importMapRaw)) || (importMapCwd && toAbsolute(importMapCwd))
		const write = writeRaw === true ? `serve.gen.ts` : writeRaw
		const watch = (watchRaw === true ? [root] : watchRaw === false ? [] : watchRaw).map(toAbsolute)

		if (serve) {
			let port: number | undefined = undefined
			if (portSpecified !== undefined) {
				if (await isPortAvailable({ port: portSpecified })) port = portSpecified
				else throw new Error(`The specified port \`${port}\` is unavailable.`)
				if (port < 1024 && Deno.uid())
					throw new Error(`The specified port \`${port}\` requires the root privileges.`)
			} else {
				port = await getAvailablePort({ port: { start: 8000, end: 65535 } })
				if (port === undefined) throw new Error("No port available between 8000–65535.")
			}
			const router = new Router({ root, suffix, write, watch, importMap })
			Deno.serve({ hostname, port }, router)
			for await (const urls of router.watch) {
				/* empty */
			}
		} else if (watch.length) {
			if (write) {
				console.log("Running with `--no-serve`; only watching and generating the manifest file.")
				const router = new Router({ root, suffix, write, watch, importMap })
				for await (const urls of router.watch) {
					/* empty */
				}
			} else {
				throw new Error("Running with `--no-serve` and `--no-write` does nothing; maybe mistake?")
			}
		} else if (write) {
			console.log("Running with `--no-serve` and `--no-watch`; only generating the manifest file.")
			await Router.write({ root, suffix, write })
		}
	} catch (error) {
		console.error(error)
		Deno.exit(1)
	}
}