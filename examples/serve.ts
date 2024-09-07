import Router from "../src/Router.ts"

await Deno.serve(new Router({ watch: true, write: true })).finished