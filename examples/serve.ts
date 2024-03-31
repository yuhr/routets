import Router from "../src/Router.ts"

Deno.serve(
	await new Router({ root: import.meta.resolve("./."), watch: event => console.log("updated") }),
)