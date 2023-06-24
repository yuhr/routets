import _8 from "./*.route.ts"
import Router from "./../src/Router.ts"
import _0 from "./.route.ts"
import _1 from "./api/hello.route.ts"
import _2 from "./hello.route.ts"
import _3 from "./null.route.ts"
import _4 from "./react.route.tsx"
import _5 from "./throw.route.ts"
import _6 from "./undefined.route.ts"
import _7 from "./void.route.ts"
import { serve } from "https://deno.land/std@0.192.0/http/server.ts"

const routetslist = [
	["/", _0],
	["/api/hello", _1],
	["/hello", _2],
	["/null", _3],
	["/react", _4],
	["/throw", _5],
	["/undefined", _6],
	["/void", _7],
	["/*", _8],
] as const
await serve(await new Router(routetslist))