// SPDX-License-Identifier: CC0-1.0

import Router from "routets/Router.ts"

await Deno.serve(
	new Router({
		root: ".",
		watch: ["components"],
		write: "serve.gen.ts",
		importMap: "import-map.json",
	})
).finished