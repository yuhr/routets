import Router from "./Router.ts"
import { serve } from "https://deno.land/std@0.192.0/http/server.ts"
import { Command } from "https://deno.land/x/cliffy@v0.25.7/command/command.ts"

if (import.meta.main) {
	try {
		const { args, options } = await new Command()
			.name("routets")
			.usage("[root] [options]")
			.description(
				"A simple interface to use `routets` from command line. It searches routes for `<root>/**/*.<suffix>.{ts,tsx}`. When running without specifying `root`, the current working directory is implied. Further documentation can be found at <https://github.com/yuhr/routets>.",
			)
			.arguments("[root:string]")
			.option("--suffix <string>", "Specifies the route filename suffix.", { default: "route" })
			.option("--no-write", "Disables generating `serve.gen.ts` but just serve your routes.")
			.option("--no-watch", "Disables watching file changes and reloading routes.")
			.option("--no-serve", "Generates `serve.gen.ts` but exits immediately.")
			.parse(Deno.args)

		const [root, ...rest] = args
		if (rest.length) throw new Error(`Unexpected arguments: ${rest.join(" ")}`)

		const { suffix, write, watch } = options

		if (options.serve) {
			await serve(await new Router({ root, suffix, write, watch }))
		} else if (write) {
			await Router.write({ root, suffix })
		}
	} catch (error) {
		console.error(error)
	}
}