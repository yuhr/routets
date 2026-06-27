// SPDX-License-Identifier: CC0-1.0

import Router from "routets/Router.ts"

await Deno.serve(
	new Router({
		root: ".",
		watch: ["components"],
		importMap: "import-map.json",
	})
).finished