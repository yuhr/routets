import Router from "../src/Router.ts"
import { serve } from "https://deno.land/std@0.192.0/http/server.ts"

await serve(
	await new Router({
		root: import.meta.resolve("./."),
		precedence: (a, b) => {
			// Sorry for the dumb algorithm :P
			const wildcard = /\/\*/
			if (wildcard.test(a)) return 1
			if (wildcard.test(b)) return -1
			return undefined
		},
	}),
)