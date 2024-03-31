import Route from "./Route.ts"
import { relative, isAbsolute, toFileUrl, join } from "https://deno.land/std@0.221.0/path/mod.ts"
import { subscribe } from "https://deno.land/x/deno_event_iterator@v2.0.2/mod.ts"
import Distree from "https://deno.land/x/distree@v2.0.0/index.ts"

const isFileUrl = (url: string | URL) => {
	if (url instanceof URL) return url.protocol === "file:"
	else return url.startsWith("file://")
}

const toUrl = (path: string) => {
	try {
		return new URL(path)
	} catch (error) {
		if (isAbsolute(path)) return toFileUrl(path)
		else return toFileUrl(join(Deno.cwd(), path))
	}
}

const normalized: unique symbol = Symbol()
type OptionsNormalized = {
	root: URL
	suffix: string
	write: boolean
	watch: boolean | ((event: Deno.FsEvent) => void | Promise<void>)
	[normalized]: undefined
}
const isOptionsNormalized = (
	options: Router.Options | OptionsNormalized,
): options is OptionsNormalized => normalized in options
const normalizeOptions = (options: Router.Options | OptionsNormalized): OptionsNormalized => {
	if (isOptionsNormalized(options)) return options

	if (options.root === "") throw new Error("Specify a directory to find routes.")
	const root = toUrl(options.root ?? Deno.cwd())
	if (!isFileUrl(root)) throw new Error("Only local paths or file URLs are supported.")

	if (options.suffix === "") throw new Error("Suffix cannot be empty.")
	const suffix = options.suffix ?? "route"
	if (suffix.search("/") !== -1) throw new Error("Suffix cannot contain slashes.")
	if (suffix.startsWith(".") || suffix.endsWith("."))
		throw new Error("Suffix cannot start or end with dots.")

	const write = options.write ?? true

	const watch = options.watch ?? false

	return { root, suffix, write, watch, [normalized]: undefined }
}

// <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#escaping>
const escapeForRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

const createRegExpFromSuffix = (suffix: string) =>
	new RegExp(`^(?<pattern>.+?)\\.${escapeForRegExp(suffix)}\\.tsx?$`, "u")

const compareByCodepoints = (a: string, b: string) => {
	const chars_a = [...a]
	const chars_b = [...b]
	const length = Math.min(chars_a.length, chars_b.length)
	for (let i = 0; i < length; i++) {
		const codePoint_a = chars_a[i]!.codePointAt(0)!
		const codePoint_b = chars_b[i]!.codePointAt(0)!
		const order = codePoint_a - codePoint_b
		if (order !== 0) return order
	}
	return chars_a.length - chars_b.length
}

class URLPatternPretty extends URLPattern {
	[Symbol.for("Deno.customInspect")]() {
		return this.pathname
	}
}

type Routes = [string, Route & { pattern: URLPatternPretty }][]
const logRoutes = (routes: Routes) => {
	console.info("Routes:")
	console.info(routes.map(([, route]) => `- ${Deno.inspect(route.pattern)}`).join("\n"))
}

type Routetslist = readonly (readonly [string, Route])[]
const isRoutetslist = (value: unknown): value is Routetslist =>
	Array.isArray(value) &&
	value.every(([key, route]) => typeof key === "string" && Route.isRoute(route))

const enumerate = async ({ root, suffix }: OptionsNormalized): Promise<Routes> => {
	const timestamp = Date.now()
	const rootReal = await Deno.realPath(root)
	const regExp = createRegExpFromSuffix(suffix)
	const distree = await Distree.fromDirectory(rootReal, async path => {
		const pathname = `/${relative(rootReal, path)}`.match(regExp)?.groups?.pattern
		if (pathname) {
			const { default: route, precedence = 0 } = await import(
				toFileUrl(path).href + "#" + timestamp
			)
			if (typeof precedence !== "number") throw new Error("Precedence must be a number.")
			if (Number.isNaN(precedence)) throw new Error("`NaN` is not a valid precedence.")
			if (Route.isRoute(route)) {
				const pattern = new URLPatternPretty({ pathname })
				return Object.assign(route, { pattern, precedence })
			}
		}
		throw undefined
	})
	return [...distree].sort(([, a], [, b]) => {
		const precedence = b.precedence - a.precedence
		if (precedence !== 0) return precedence
		return compareByCodepoints(a.pattern.pathname, b.pattern.pathname)
	})
}

class IdentifierPretty {
	constructor(public name: string) {}
	[Symbol.for("Deno.customInspect")]() {
		return this.name
	}
}

const emit = async (root: URL, routes: Routes) => {
	let content = ""
	const map = new Map<string, IdentifierPretty>()
	content += routes
		.map(([path, route]) => {
			map.set(route.pattern.pathname, new IdentifierPretty(`_${map.size}`))
			return `import _${map.size - 1} from "./${path}"`
		})
		.join("\n")
	const self = new URL(import.meta.url)
	const specifierRouter = isFileUrl(self)
		? `./${relative(root.pathname, self.pathname)}`
		: self.href
	content += `\nimport Router from "${specifierRouter}"`
	content += `\nconst routetslist = ${Deno.inspect([...map.entries()])} as const`
	content += `\nDeno.serve(await new Router(routetslist))`
	await Deno.writeTextFile(join(root.pathname, "serve.gen.ts"), content)
}

const unexpected = (response: unknown, pathname: string) => {
	console.error(`Unexpected response value for route \`${pathname}\`: ${Deno.inspect(response)}`)
	console.error("Only a `Response` or `undefined` is allowed to be returned from a handler.")
	return new Response(undefined, { status: 500 })
}
const thrown = (error: unknown, pathname: string) => {
	console.error(`Handler thrown for route \`${pathname}\`: ${Deno.inspect(error)}`)
	return new Response(undefined, { status: 500 })
}

const map = async function* <T, U>(
	source: AsyncIterable<T>,
	transformer: (item: T, index: number) => U | Promise<U>,
) {
	let i = 0
	for await (const item of source) {
		yield await transformer(item, i++)
	}
}

namespace Router {
	export type Handler = (request: Request) => Promise<Response>
	export type Options = {
		/**
		 * The root directory to search for routes.
		 */
		readonly root?: string | undefined
		/**
		 * The suffix to use for route files e.g. being `route` results in `*.route.ts`.
		 */
		readonly suffix?: string | undefined
		/**
		 * Whether to generate `serve.gen.ts`, which is necessary for deployments to environments that don't support dynamic imports, such as Deno Deploy.
		 */
		readonly write?: boolean | undefined
		/**
		 * Whether to watch for changes and update the routes automatically.
		 */
		readonly watch?: boolean | ((event: Deno.FsEvent) => void | Promise<void>) | undefined
	}
}

interface Router extends Promise<Router.Handler> {}

class Router {
	/**
	 * Enumerates routes. The return value can be passed to the constructor.
	 */
	static async enumerate(options: Router.Options): Promise<Routetslist> {
		return await enumerate(normalizeOptions(options))
	}

	/**
	 * Enumerates routes and generates `serve.gen.ts`. The return value can be passed to the constructor.
	 */
	static async write(options: Router.Options): Promise<Routetslist> {
		const optionsNormalized = normalizeOptions(options)
		const { root } = optionsNormalized
		const routetslist = await enumerate(optionsNormalized)
		await emit(root, routetslist)
		return routetslist
	}

	#routes: Routes = []
	#reloads = new EventTarget()
	async #populate(options: Router.Options | Routetslist): Promise<void | never> {
		if (isRoutetslist(options)) {
			const routes = options.map<Routes[number]>(([pathname, route]) => {
				const pattern = new URLPatternPretty({ pathname })
				return [pathname, Object.assign(route, { pattern })]
			})
			this.#routes = routes
			logRoutes(routes)
		} else {
			const optionsNormalized = normalizeOptions(options)
			const { root, write, watch } = optionsNormalized
			let routes = await enumerate(optionsNormalized)
			if (write) await emit(root, routes)
			this.#routes = routes
			logRoutes(routes)
			if (watch) {
				const { createCache } = await import("jsr:@deno/cache-dir@^0.8.0")
				const { createGraph } = await import("jsr:@deno/graph@^0.69.10")
				const cache = createCache()
				// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
				while (true) {
					const graph = await createGraph(
						toFileUrl(join(root.pathname, "serve.gen.ts")).href,
						cache,
					)
					const modules = graph.modules
						.map(({ specifier }) => specifier)
						.filter(isFileUrl)
						.map(url => new URL(url).pathname)
					const watcher = Deno.watchFs([root.pathname, ...modules])
					this.#reloads.dispatchEvent(new Event("reload"))
					for await (const event of watcher) {
						if (event.paths.every(path => path.endsWith("serve.gen.ts"))) continue
						watcher.close()
						routes = await enumerate(optionsNormalized)
						if (write) await emit(root, routes)
						this.#routes = routes
						if (typeof watch === "function") await watch(event)
					}
				}
			}
		}
	}
	async watch(options: Router.Options | Routetslist) {}

	/**
	 * Creates a router. The return value is a `Promise` that resolves to a [`Deno.ServeHandler`](https://deno.land/api@v1.42.0?s=Deno.ServeHandler), so you have to `await` before passing to [`Deno.serve`](https://deno.land/api@v1.42.0?s=Deno.serve).
	 */
	constructor(options: Router.Options | Routetslist) {
		// @ts-expect-error: returning a `Promise<Router.Handler>`
		return (async () => {
			this.#populate(options)
			const handler = async (request: Request): Promise<Response> => {
				const url = new URL(request.url)
				for (const [path, route] of this.#routes) {
					const match = route.pattern.exec(url)
					if (match) {
						try {
							const captured = match.pathname.groups
							const pattern = new URLPattern(route.pattern)
							const reloads = map(subscribe.call(this.#reloads, "reload"), event => {})
							const response = await route({ request, captured, path, pattern, reloads })
							if (response instanceof Response) return response
							// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
							else if (response === undefined) continue
							else return unexpected(response, url.pathname)
						} catch (error) {
							return thrown(error, url.pathname)
						}
					}
				}
				return new Response(undefined, { status: 404 })
			}
			return Object.setPrototypeOf(handler, new.target.prototype) as Router.Handler
		})()
	}
}

export default Router