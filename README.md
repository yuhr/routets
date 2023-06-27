<div align="center"><br><br>

# ROUTETS

[![License](https://img.shields.io/github/license/yuhr/routets?color=%231e2327)](LICENSE)

Vanilla filesystem-based routing for Deno.

<br><br></div>

`routets` is a [`Handler`](https://deno.land/std@0.192.0/http/server.ts?s=Handler) generator that performs filesystem-based routing.

No other stuff. That's all. I was always tired of fullstack frameworks such as Fresh or Aleph.js, because of the tightly coupled design that forces users to be on the rails. So I ended up making this stupid-simple solution, which is aimed to be:

- No magic and no blackbox
- Small size and less dependency
- No squatted slugs like `/_app` or `/_404`
- No lock-in to a specific JSX implementation
- No lock-in to a specific architecture; MPA or SPA, SSR or CSR, etc.

So, `routets` is deliberately less-featured. It just provides a basic building block for writing web servers in Deno, leveraging Create Your Own™ style of experience.

## Basic Usage

Create a file with the filename being `<your-route-name>.route.ts`, say `./greet.route.ts` here and the content is like this:

```typescript
import Route from "https://lib.deno.dev/x/routets@v2/Route.ts"

export default new Route(async () => {
	return new Response("Hello, World!")
})
```

`routets` comes with a built-in CLI. During development, you can use this and serve your routes immediately:

```sh
$ deno install -Af https://lib.deno.dev/x/routets@v2/routets.ts
$ routets # or `routets somewhere` to serve `somewhere/greet.route.ts` at `/greet`
Listening on http://localhost:8000/
```

And you'll see “Hello, World!” at [`http://localhost:8000/greet`](http://localhost:8000/greet).

Alternatively, of course you can create your own script:

```typescript
import Router from "https://lib.deno.dev/x/routets@v2/Router.ts"
import { serve } from "https://deno.land/std@0.192.0/http/server.ts"

await serve(await new Router({ root: import.meta.resolve("./.") }))
```

## Advanced Usage

### Dynamic Routes

`routets` supports dynamic routes by [URL Pattern API](https://developer.mozilla.org/en-US/docs/Web/API/URL_Pattern_API). Please refer to the MDN documentation for the syntax and examples.

Matched parts of the pathname will be passed to the second argument of the handler. For example, when you have `:dynamic.route.ts` with the content being:

```typescript
import Route from "https://lib.deno.dev/x/routets@v2/Route.ts"

export default new Route(async ({ slugs }) => {
	return new Response(JSON.stringify(slugs), { headers: { "Content-Type": "application/json" } })
})
```

Accessing `/route` will show you `{"dynamic":"route"}`.

### Route Precedence

Once you have started using dynamic routes, you may notice it is unclear which route will be matched when multiple dynamic routes are valid for the requested pathname. For example, if you have a file named `greet.route.ts` and another file named `*.route.ts`, which one will be matched when you access `/greet`?

By default, `routets` doesn't do anything smart, and just performs codepoint-wise lexicographic ordering. So, in the above example, `*.route.ts` will be matched first, as `*` precedes `g` in Unicode. If you want to change this behavior, just named-export a number as `precedence` from each route:

```typescript
// in `*.route.ts`
export const precedence = 0
```

```typescript
// in `greet.route.ts`
export const precedence = 9
```

Routes with greater precedences are matched first. Think of it as `z-index` in CSS. So, this time `greet.route.ts` will be matched first.

If `precedence` is not exported, it implies 0.

### Route Fallthrough

If a route returns nothing (namely `undefined`), then it fallthroughs to the next matching route.

### Extending `Route`

If you want to insert middlewares before/after an execution of handlers, you can extend the `Route` class as usual in TypeScript.

To exercise this, here we add support for returning a React element from handlers!

```typescript
import Route from "https://lib.deno.dev/x/routets@v2/Route.ts"
import { renderToReadableStream } from "https://esm.sh/react-dom@18.2.0/server"
import { isValidElement, ReactElement, Suspense } from "https://esm.sh/react@18.2.0"

class RouteReact extends Route {
	constructor(handler: Route.Handler<ReactElement<unknown>>) {
		super(async context => {
			const response = await handler(context)
			if (isValidElement(response))
				return new Response(
					await renderToReadableStream(
						<html>
							<body>
								<Suspense fallback={<p>Loading...</p>}>{response}</Suspense>
							</body>
						</html>,
					),
					{
						headers: {
							"Content-Type": "text/html; charset=utf-8",
							"X-Content-Type-Options": "nosniff",
						},
					},
				)
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

let done = false
const Component = () => {
	if (!done) {
		throw new Promise(resolve =>
			setTimeout(() => {
				done = true
				resolve(undefined)
			}, 3000),
		)
	} else {
		done = false
		return <b>Hello, World!</b>
	}
}

export default new RouteReact(async () => {
	return <Component />
})
```

In a browser, this will show you “Loading…” for 3 seconds, and then “Hello, World!”.

### Suffix Restrictions

Changing the route filename suffix (`route` by default) is possible by `--suffix` when using the CLI and by `suffix` option when using the `Router` constructor. Although, there are some restrictions on the shape of suffixes:

- Cannot be empty
- Cannot contain slashes
- Cannot start or end with dots

These are by design and will never be lifted.

## Deploying to Deno Deploy

`routets` uses dynamic imports to discover routes. This works well locally, but can be a problem if you want to get it to work with environments that don't support dynamic imports, such as [Deno Deploy](https://github.com/denoland/deploy_feedback/issues/1).

For this use case, by default the `routets` CLI and the `Router` constructor do generate a server module `serve.gen.ts` that statically imports routes. This module can directly be used as the entrypoint for Deno Deploy.

You can disable this behavior by `--no-write` option when using the CLI and by `write` option when using the `Router` constructor.

## Difference from `fsrouter`

There exists a similar package [`fsrouter`](https://deno.land/x/fsrouter) which has quite the same UX overall, but slightly different in:

- Suffix namespacing. `routets` uses namespaced filenames e.g. `greet.route.ts`, while `fsrouter` is just `greet.ts`.
- Dynamic routing syntax. `routets` uses [URL Pattern API](https://developer.mozilla.org/en-US/docs/Web/API/URL_Pattern_API) e.g. `:id.route.ts`, while `fsrouter` uses the [bracket syntax](https://github.com/justinawrey/fsrouter#dynamic-routes) e.g. `[id].ts`. Also, `routets` doesn't support [typed dynamic routes](https://github.com/justinawrey/fsrouter#typed-dynamic-routes).
- JavaScript file extensions. `routets` doesn't allow `js` or `jsx`, while `fsrouter` does.

## Semver Policy

Only the default exports are public APIs and remain stable throughout minor version bumps. Named exports should be considered private and unstable. Any single release may randomly contain breaking changes to named exports, so users should avoid using them where possible.