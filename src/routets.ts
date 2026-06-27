// SPDX-License-Identifier: MPL-2.0

import Router from "./Router.ts"
import { Command } from "https://deno.land/x/cliffy@v0.25.7/command/command.ts"
import { isPortAvailable, getAvailablePort } from "https://deno.land/x/port@1.0.0/mod.ts"
import { isAbsolute } from "https://esm.sh/jsr/@std/path@1.1.5/is_absolute.ts"
import { resolve } from "https://esm.sh/jsr/@std/path@1.1.5/resolve.ts"

const marker = ""

const tryFindConfigCwd = async (pathToDenoManifest: string) => {
	await Deno.stat(pathToDenoManifest)
	return pathToDenoManifest
}

const cwd = Deno.cwd()
const toAbsolute = (path: string) => (isAbsolute(path) ? path : resolve(cwd, path))
const toFileUrl = (path: string) => new URL(toAbsolute(path), "file:")

const [first, ...rest] = Deno.args
const argsRaw = first === marker ? rest : Deno.args
const { args, options } = await new Command()
	.name("routets")
	.usage("[root] [options]")
	.description(
		"A simple command line interface to use `routets` with Deno. It searches routes for `<root>/**/*.<suffix>.{ts,tsx}`. When running without specifying `root`, the current working directory is implied.\n\nFurther documentation can be found at <https://github.com/yuhr/routets>."
	)
	.arguments("[root:string]")
	.option(
		"--suffix <string>",
		"Specifies the route filename suffix. It cannot be empty, cannot contain slashes, cannot start or end with dots.",
		{ default: "route" }
	)
	.option(
		"--watch [...paths:string]",
		"Enables watching for file changes and reloading routes. Without paths, the same directory as `root` is implied. Supports multiple paths, relative from the current working directory.",
		{ default: true }
	)
	.option("--no-watch", "Disables watching.")
	.option(
		"--write <path:string>",
		"Enables generating an index module at the specified path, relative from the current working directory. With `--watch` option, it is rewritten on every change. The path cannot ends with a valid route filename.",
		{ default: undefined }
	)
	.option("--no-serve", "Disables serving. Useful when you only want to generate an index module.")
	.option(
		"--config <path:string>",
		"Specifies a path to the Deno maifest JSON file i.e. `deno.json` or `deno.jsonc`, relative from the current working directory. Defaulting to the one in the current working directory if it exists."
	)
	.option(
		"--import-map <path:string>",
		"Specifies a path to the import map JSON file to use while watching. Defaulting to the one specified in the Deno manifest JSON file in the current working directory if it exists."
	)
	.option("--hostname <string>", "Specifies the hostname to serve at.", {
		default: "0.0.0.0",
	})
	.option(
		"--port <port:number>",
		"Specifies the port to serve at. Defaulting to the first available port between 8000–65535. When a value is given but unavailable, it simply throws."
	)
	.option("--init [template:string]", "Creates a new routets project under the current directory.")
	.helpOption("--help", "Shows this help.", { prepend: false })
	.parse(argsRaw)
const {
	suffix,
	write: writeSpecified,
	watch: watchSpecified,
	serve,
	config: configSpecified,
	importMap: importMapSpecified,
	hostname,
	port: portSpecified,
	init,
} = options

const config = configSpecified
	? toFileUrl(configSpecified)
	: await tryFindConfigCwd("deno.jsonc")
			.catch(async () => await tryFindConfigCwd("deno.json"))
			.then(toFileUrl)
			.catch(() => undefined)
const importMap = importMapSpecified && toFileUrl(importMapSpecified)

if (import.meta.main && Deno.args[0] !== marker) {
	// Required running in another process, because installed scripts don't support import maps out of the box.
	const argsConfig = config ? ["--config", config.pathname] : []
	const argsImportMap = importMap ? ["--import-map", importMap.pathname] : []
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
	if (init) {
		const templates = (
			await Array.fromAsync(Deno.readDir(new URL(import.meta.resolve("./templates")).pathname))
		).flatMap(dirEntry => (dirEntry.isDirectory ? [dirEntry.name] : []))
		if (templates.includes(init)) {
			console.log("success")
		} else throw new Error(`Unknown template type: ${init}`)
	} else {
		try {
			const [rootSpecified = cwd, ...rest] = args
			if (rest.length) throw new Error(`Unexpected arguments: ${rest.join(" ")}`)

			const root = toFileUrl(rootSpecified)
			const watch =
				watchSpecified === true
					? [root]
					: watchSpecified === false
						? []
						: watchSpecified.map(toFileUrl)
			const write = writeSpecified && toFileUrl(writeSpecified)

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
					console.info("Running with `--no-serve`; only watching and generating the index module.")
					const router = new Router({ root, suffix, write, watch, importMap })
					for await (const urls of router.watch) {
						/* empty */
					}
				} else {
					throw new Error(
						"Running with `--no-serve` without `--write` does nothing; maybe a mistake?"
					)
				}
			} else if (write) {
				console.info(
					"Running with `--no-serve` and `--no-watch`; only generating the manifest file."
				)
				await Router.write({ root, suffix, write })
			}
			Deno.exit(0)
		} catch (error) {
			console.error(error)
			Deno.exit(1)
		}
	}
}