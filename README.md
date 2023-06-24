<div align="center"><br><br>

# ROUTETS

[![License](https://img.shields.io/github/license/yuhr/routets?color=%231e2327)](LICENSE)

Vanilla filesystem-based routing for Deno.

<br><br></div>

`routets` is a [`Handler`](https://deno.land/std@0.192.0/http/server.ts?s=Handler) generator that performs filesystem-based routing.

No other stuff. That's all. I was always tired of fullstack frameworks such as Fresh or Aleph.js, because of the tightly coupled design that forces users to be on the rails. So I ended up making this stupid-simple solution, which is aimed to be:

- No magic
- Small size and less dependency
- No squatted slugs like `/_app` or `/_404`

## Basic Usage

Create a file with the filename being `<your-route-name>.route.ts`, say `./greet.route.ts` here and the content is like this:

```typescript
import Route from "https://lib.deno.dev/x/routets@v1/Route.ts"

export default new Route(async () => {
	return new Response("Hello, World!")
})
```

`routets` comes with a built-in CLI. During development, you can use this and serve your routes immediately:

```sh
$ deno install -Af https://lib.deno.dev/x/routets@v1/routets.ts
$ routets # or `routets somewhere` to serve `somewhere/greet.route.ts` at `/greet`
Listening on http://localhost:8000/
```

And you'll see “Hello, World!” at [`http://localhost:8000/greet`](http://localhost:8000/greet).

Alternatively, of course you can create your own script:

```typescript
import Router from "https://lib.deno.dev/x/routets@v1/Router.ts"
import { serve } from "https://deno.land/std@0.192.0/http/server.ts"

await serve(await new Router({ root: import.meta.resolve("./.") }))
```

## Extending `Route`

If you want to insert middlewares before/after an execution of handlers, you can extend the `Route` class as usual in TypeScript.

To exercise this, here we add support for returning a React element from handlers!

```typescript
import Route from "https://lib.deno.dev/x/routets@v1/Route.ts"
import { renderToStaticMarkup } from "https://esm.sh/react-dom@18.2.0/server"
import React, { isValidElement } from "https://esm.sh/react@18.2.0"

class RouteReact extends Route {
	constructor(handler: Route.Handler<React.ReactElement<unknown>>) {
		super(async (request, slugs) => {
			const response = await handler(request, slugs)
			if (isValidElement(response))
				return new Response(renderToStaticMarkup(response), {
					headers: { "Content-Type": "text/html; charset=utf-8" },
				})
			return response
		})
	}
}

export default RouteReact
```

And don't forget to add following options to your `deno.jsonc`:

```jsonc
{
	"compilerOptions": {
		"jsx": "react-jsx",
		"jsxImportSource": "https://esm.sh/react@18.2.0"
	}
}
```

That's it! You can now create a route with it:

```typescript
import RouteReact from "./RouteReact.ts"

export default new RouteReact(async () => {
	return <b>Hello, World!</b>
})
```

## Route Precedence

Once you have started using dynamic routes, you may notice it is unclear which route will be matched when multiple dynamic routes are valid for the requested pathname. For example, if you have a file named `greet.route.ts` and another file named `*.route.ts`, which one will be matched when you access `/greet`?

By default, `routets` doesn't do anything smart, and just performs codepoint-wise lexicographic ordering. So, in the above example, `*.route.ts` will be matched first, as `*` precedes `g` in Unicode. If you want to change this behavior, you can use the `precedence` option in the `Router` constructor (in the CLI this isn't available):

```typescript
await serve(
	await new Router({
		root: import.meta.resolve("./."),
		// Comparison function for pathname patterns.
		precedence: (a, b) => {
			// Sorry for the dumb algorithm :P
			const wildcard = /\/\*/
			if (wildcard.test(a)) return 1
			if (wildcard.test(b)) return -1
			// Returning `undefined` fallbacks to the default behavior.
			return undefined
		},
	}),
)
```

Improved handling for this is a planned feature.

## Route Fallthrough

If a route returns nothing (namely `undefined`), then it fallthroughs to the next matching route.

## Suffix Restrictions

Changing the route filename suffix (`route` by default) is possible by `--suffix` when using the CLI and by `suffix` option when using the `Router` constructor. Although, there are some restrictions on the shape of suffixes:

- Cannot be empty
- Cannot contain slashes
- Cannot start or end with dots

These are by design and will never be lifted.

## Deploying to Deno Deploy

`routets` uses dynamic imports to discover routes. This works well locally, but can be a problem if you want to get it to work with environments that don't support dynamic imports, such as [Deno Deploy](https://github.com/denoland/deploy_feedback/issues/1). For this use case, by default the `routets` CLI and the `Router` constructor do generate a server module `serve.gen.ts` that statically import routes. This module can directly be used as the entrypoint for Deno Deploy.

## Difference From `fsrouter`

There exists a similar package [`fsrouter`](https://deno.land/x/fsrouter) which has quite the same UX overall, but slightly different in:

- License. `routets` is licensed under MPL-2.0, while `fsrouter` is not licensed at all! (ATTOW)
- Suffix namespacing. `routets` uses namespaced filenames e.g. `greet.route.ts`, while `fsrouter` is just `greet.ts`.
- Dynamic routing syntax. `routets` uses [URL Pattern API](https://developer.mozilla.org/en-US/docs/Web/API/URL_Pattern_API) e.g. `:id.route.ts`, while `fsrouter` uses the [bracket syntax](https://github.com/justinawrey/fsrouter#dynamic-routes) e.g. `[id].ts`. Also, `routets` doesn't support [typed dynamic routes](https://github.com/justinawrey/fsrouter#typed-dynamic-routes).
- JavaScript file extensions. `routets` doesn't allow `js` or `jsx`, while `fsrouter` does.

## Semver Policy

Only the default exports are public APIs and remain stable throughout minor version bumps. Named exports should be considered private and unstable. Any single release may randomly contain breaking changes to named exports, so users should avoid using them where possible.