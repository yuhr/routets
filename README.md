<div align="center"><br><br>

# ROUTETS

[![License](https://img.shields.io/github/license/yuhr/routets?color=%231e2327)](LICENSE)

Vanilla filesystem-based routing for TypeScript.

<br><br></div>

`routets` is an HTTP request handler generator that performs filesystem-based routing.

No other stuff. That's all. I was always tired of fullstack frameworks such as Fresh or Aleph.js, because of the tightly coupled design that forces users to be on the rails. So I ended up making this stupid-simple solution, which is aimed to be:

- No magic and no blackbox
- Small size and less dependency
- No squatted pathnames like `/index`, `/_app`, or `/_404`
- No lock-in to a specific JSX implementation
- No lock-in to a specific architecture; MPA or SPA, SSR or CSR, etc.
- Use of Web standard APIs

So, `routets` is deliberately less-featured. It just provides a basic building block for writing web servers in TypeScript, leveraging Create Your Own™ style of experience.

`routets` primarily targets Deno and Deno Deploy, but its core APIs (i.e. `Router` and `Route`) are meant to work across multiple runtimes.

## Basic Usage

Create a file with the filename being `<your-route-name>.route.ts`, say `./greet.route.ts` here and the content is like this:

```ts
import Route from "https://deno.land/x/routets/Route.ts"

export default new Route(async () => {
	return new Response("Hello, World!")
})
```

`routets` comes with a built-in CLI for Deno. During development, you can use this and serve your routes immediately:

```sh
$ deno install -gAf https://deno.land/x/routets/routets.ts
$ routets # or `routets somewhere` to serve `somewhere/greet.route.ts` at `/greet`
Listening on http://0.0.0.0:8000/ (http://localhost:8000/)
Routes:
+ /greet
```

And you'll see “Hello, World!” at [`http://localhost:8000/greet`](http://localhost:8000/greet).

Alternatively, of course you can create your own script:

```ts
import Router from "https://deno.land/x/routets/Router.ts"

await Deno.serve(new Router({ root: ".", watch: true })).finished
```

## Advanced Usage

### Dynamic Routes

`routets` supports dynamic routes by [URL Pattern API](https://developer.mozilla.org/en-US/docs/Web/API/URL_Pattern_API). Please refer to the MDN documentation for the syntax and examples.

Captured parts of the pathname will be available in the first parameter of the handler. For example, when you have `:dynamic.route.ts` with the content being:

```ts
import Route from "https://deno.land/x/routets/Route.ts"

export default new Route(async ({ captured }) => {
	return new Response(JSON.stringify(captured), { headers: { "Content-Type": "application/json" } })
})
```

Accessing `/route` will show you `{"dynamic":"route"}`.

### Route Precedence

Once you have started using dynamic routes, you may notice it is unclear which route will be matched when multiple routes are valid for the requested pathname. For example, if you have files named `.route.ts` and `*.route.ts`, which one will be matched when you access `/`?

By default, `routets` doesn't do anything smart, and just performs **codepoint-wise reverse-lexicographic ordering** of **pathname patterns** (not of actual file paths, which include the suffix and the extension). So, in the above example, `*.route.ts` will win, as `/*` precedes `/` reverse-lexicographically. If you want to change this behavior, just named-export a number as `precedence` from each route:

```ts
// in `.route.ts`
export const precedence = 1
```

If `precedence` is not exported, it implies `0`.

Routes with greater precedences win. Think of it like `z-index` in CSS. So, at this time `.route.ts` will be matched first. You can always confirm the ordering by seeing the output of `routets` (routes listed earlier win):

```sh
$ routets
Listening on http://0.0.0.0:8000/
Routes:
+ /
+ /*
```

### Route Fallthrough

If a route returns nothing (namely `undefined`), then it fallthroughs to the next matching route.

### Extending `Route`

If you want to insert middlewares before/after an execution of handlers, you can extend the `Route` class as usual in TypeScript.

To exercise this, here we add support for returning a React element from handlers!

```tsx
import Route from "https://deno.land/x/routets/Route.ts"
import { renderToReadableStream } from "https://esm.sh/react-dom@19.2.7/server"
import { type ReactElement, Suspense } from "https://esm.sh/react@19.2.7"

class RouteReact extends Route {
	constructor(handler: Route.Handler<ReactElement<unknown>>) {
		super(async context => {
			const response = await handler(context)
			return new Response(
				await renderToReadableStream(
					<html>
						<body>
							<Suspense fallback={<p>Loading...</p>}>{response}</Suspense>
						</body>
					</html>
				),
				{ headers: { "Content-Type": "text/html" } }
			)
		})
	}
}

export default RouteReact
```

And don't forget to add following options to your `deno.json`:

```jsonc
{
	"compilerOptions": {
		"jsx": "react-jsx",
		"jsxImportSource": "https://esm.sh/react@19.2.7"
	}
}
```

That's it! You can now create a route using it, e.g. with the filename being `.route.tsx`:

```tsx
import RouteReact from "./RouteReact.ts"
import { delay } from "https://esm.sh/jsr/@std/async@1.0.12/delay.ts"

let done = false
const Component = () => {
	if (!done) {
		throw delay(3000).then(() => (done = true))
	} else {
		done = false
		return <b>Hello, World!</b>
	}
}

export default new RouteReact(async () => {
	return <Component />
})
```

In a browser, accessing [`http://localhost:8000`](http://localhost:8000) will show you “Loading…” for 3 seconds, and then “Hello, World!”.

### Changing Suffix

Changing the route filename suffix (`route` by default) is possible by `--suffix` when using the CLI and by `suffix` option when using the `Router` constructor. Although, there are some restrictions on the shape of suffixes:

- Cannot be empty
- Cannot contain slashes
- Cannot start or end with dots

These are by design and will never be lifted. `routets` is made with the principle of least surprise; suffixes are technically required as Deno doesn't recognize a file named `.ts` to be a TypeScript module, while you must be freely able to use _any_ route file name for your own purpose, including the empty string.

Notably, use of suffix allows you to place related modules like `*.test.ts` aside of routes.

## Deploying to Deno Deploy

Basically, `routets` uses non-statically-analyzeable dynamic imports to discover routes. This works well locally, but can be a problem if you want to get it to work with environments that don't support non-statically-analyzeable dynamic imports, such as [Deno Deploy](https://github.com/denoland/deploy_feedback/issues/433).

For this use case, you can use `routets --write serve.gen.ts` which generates an index module at the specified path (relative from the serving root) that does only statically-analyzeable dynamic import of routes. This module can directly be used as the entrypoint for Deno Deploy.

## Difference from `fsrouter`

There exists a similar package [`fsrouter`](https://deno.land/x/fsrouter) which has quite the same UX overall, but slightly different in:

- Suffix namespacing. `routets` uses namespaced filenames e.g. `greet.route.ts`, while `fsrouter` is just `greet.ts`.
- Dynamic routing syntax. `routets` uses [URL Pattern API](https://developer.mozilla.org/en-US/docs/Web/API/URL_Pattern_API) e.g. `:id.route.ts`, while `fsrouter` uses the [bracket syntax](https://github.com/justinawrey/fsrouter#dynamic-routes) e.g. `[id].ts`. Also, `routets` doesn't support [typed dynamic routes](https://github.com/justinawrey/fsrouter#typed-dynamic-routes).
- JavaScript file extensions. `routets` doesn't allow `js` or `jsx`, while `fsrouter` does.