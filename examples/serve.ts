// SPDX-License-Identifier: CC0-1.0

import Router from "../src/Router.ts"

await Deno.serve(new Router({ watch: true, write: "serve.gen.ts" })).finished