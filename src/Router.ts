// SPDX-License-Identifier: MPL-2.0

import Route from "./Route.ts"
import {
	callsites,
	type CallSite,
} from "https://deno.land/x/callsites@0.0.1/modules/callsites/mod.ts"
import Distree from "https://deno.land/x/distree@v2.0.0/index.ts"
import { isAbsolute } from "https://jsr.io/@std/path/1.0.8/is_absolute.ts"
import { join } from "https://jsr.io/@std/path/1.0.8/join.ts"
import { relative } from "https://jsr.io/@std/path/1.0.8/relative.ts"
import { toFileUrl } from "https://jsr.io/@std/path/1.0.8/to_file_url.ts"

const getCallSite = () => callsites()[2]!

const isFileUrl = (url: string | URL) => {
	if (url instanceof URL) return url.protocol === "file:"
	else return url.startsWith("file://")
}

const toUrl = (path: string | URL, callSite: CallSite): URL => {
	if (path instanceof URL) return path
	try {
		return new URL(path)
	} catch (error) {
		if (isAbsolute(path)) return toFileUrl(path)
		else return new URL(path, toUrl(callSite.getFileName()!, callSite))
	}
}

const encodeUriPathname = (pathname: string) =>
	pathname.split("/").map(encodeURIComponent).join("/")

const decodeUriPathname = (pathname: string) =>
	pathname.split("/").map(decodeURIComponent).join("/")

const normalized: unique symbol = Symbol()

type OptionsNormalized = {
	root: URL
	pattern: RegExp
	write: string | false
	watch: URL[]
	importMap: URL | undefined
	[normalized]: undefined
}

const isOptionsNormalized = (
	options: Router.Options | OptionsNormalized,
): options is OptionsNormalized => normalized in options

const normalizeOptions = (
	options: Router.Options | OptionsNormalized,
	callSite: CallSite,
): OptionsNormalized => {
	if (isOptionsNormalized(options)) return options

	if (options.root === "") throw new Error("Specify a directory to find routes.")
	const root = toUrl(options.root ?? ".", callSite)
	if (!isFileUrl(root)) throw new Error("Only local paths or file URLs are supported.")

	if (options.suffix === "") throw new Error("Suffix cannot be empty.")
	const suffix = options.suffix ?? "route"
	if (suffix.search("/") !== -1) throw new Error("Suffix cannot contain slashes.")
	if (suffix.startsWith(".") || suffix.endsWith("."))
		throw new Error("Suffix cannot start or end with dots.")
	const pattern = createRegExpFromSuffix(suffix)

	if (options.write === "") throw new Error("Index module file name cannot be empty.")
	const write = options.write ?? false

	const watch =
		options.watch === true
			? [root]
			: options.watch === false || options.watch === undefined
				? []
				: typeof options.watch === "string"
					? [toUrl(options.watch, callSite)]
					: options.watch instanceof URL
						? [options.watch]
						: options.watch.map(path => toUrl(path, callSite))

	const importMap = options.importMap ? toUrl(options.importMap, callSite) : undefined

	return { root, pattern, write, watch, importMap, [normalized]: undefined }
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
		const codepoint_a = chars_a[i]!.codePointAt(0)!
		const codepoint_b = chars_b[i]!.codePointAt(0)!
		const order = codepoint_a - codepoint_b
		if (order !== 0) return order
	}
	return chars_a.length - chars_b.length
}

class URLPatternPretty extends URLPattern {
	[Symbol.for("Deno.customInspect")](): string {
		return this.pathname
	}
}

const logRoutes = (updated: Router.Routes, stale?: Router.Routes) => {
	if (stale) {
		const setUpdated = new Set(updated.map(([, route]) => Deno.inspect(route.pattern)))
		const setStale = new Set(stale.map(([, route]) => Deno.inspect(route.pattern)))
		const added = [...setUpdated.difference(setStale)]
		const removed = [...setStale.difference(setUpdated)]
		if (0 < added.length + removed.length) console.info("Routes diff:")
		if (0 < added.length) console.info(added.map(pattern => "+ " + pattern).join("\n"))
		if (0 < removed.length) console.info(removed.map(pattern => "- " + pattern).join("\n"))
	} else {
		console.info("Routes:")
		console.info(updated.map(([, route]) => `+ ${Deno.inspect(route.pattern)}`).join("\n"))
	}
}

type Routetslist = readonly (readonly [string, Route])[]

const isRoutetslist = (value: unknown): value is Routetslist =>
	Array.isArray(value) &&
	value.every(
		route =>
			Array.isArray(route) &&
			route.length === 2 &&
			typeof route[0] === "string" &&
			Route.isRoute(route[1]),
	)

const enumerate = async ({ root, pattern }: OptionsNormalized): Promise<Router.Routes> => {
	const timestamp = Date.now()
	const rootReal = await Deno.realPath(root)
	const distree = await Distree.fromDirectory(rootReal, async path => {
		const pathname = `/${relative(rootReal, path)}`.match(pattern)?.groups?.pattern
		if (pathname) {
			const specifier = toFileUrl(path).href + "?timestamp=" + timestamp
			const { default: route, precedence = 0 } = await import(specifier)
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
		return compareByCodepoints(b.pattern.pathname, a.pattern.pathname)
	})
}

const emit = async (root: string, routes: Router.Routes, path: string) => {
	const routetslist = routes
		.map(
			([path, route]) =>
				`[${JSON.stringify(route.pattern.pathname)}, (await import(${JSON.stringify(
					`./${encodeUriPathname(path)}`,
				)})).default]`,
		)
		.join(",\n\t")
	const self = new URL(import.meta.url)
	const specifierRouter = isFileUrl(self) ? `./${relative(root, self.pathname)}` : self.href
	let content = `import Router from "${specifierRouter}"`
	content += `\nconst routetslist = [\n\t${routetslist}\n] as const`
	content += `\nawait Deno.serve(new Router(routetslist)).finished`
	await Deno.writeTextFile(join(root, path), content)
}

const unexpected = (response: unknown, pathname: string) => {
	console.error(`Unexpected response value for route \`${pathname}\`: ${Deno.inspect(response)}`)
	console.error("Only a `Response` or `undefined` is allowed to be returned from a handler.")
	return new Response(undefined, { status: 500 })
}

const thrown = (error: unknown, pathname: string) => {
	console.error(`Handler threw for route \`${pathname}\`: ${Deno.inspect(error)}`)
	return new Response(undefined, { status: 500 })
}

namespace Router {
	export type Options = {
		/**
		 * The serving root directory to search for routes.
		 *
		 * @default "."
		 */
		readonly root?: string | URL | undefined
		/**
		 * The suffix to search for routes e.g. being `"route"` results in `*.route.ts` and `*.route.tsx`.
		 *
		 * @default "route"
		 */
		readonly suffix?: string | undefined
		/**
		 * Whether to generate the index module, which is necessary for deployments to environments that don't support dynamic imports, such as Deno Deploy.
		 *
		 * @default false
		 */
		readonly write?: string | false | undefined
		/**
		 * Where to watch for changes and update the routes automatically. If `true`, the same path as the `root` is used.
		 *
		 * @default false
		 */
		readonly watch?: boolean | string | URL | readonly (string | URL)[] | undefined
		/**
		 * The path to the JSON file representing the import map to be used while watching.
		 *
		 * @default undefined
		 */
		readonly importMap?: string | URL | undefined
	}

	export type Routes = readonly (readonly [string, Route & { pattern: URLPatternPretty }])[]
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
interface Router {
	(request: Request): Promise<Response>
}

/**
 * A [`Deno.ServeHandler`](https://docs.deno.com/api/deno/~/Deno.ServeHandler) generator that performs filesystem-based routing.
 */
// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
class Router {
	/**
	 * Enumerates routes. The resolved value can be passed to the constructor.
	 */
	static async enumerate(options: Router.Options = {}): Promise<Router.Routes> {
		const optionsNormalized = normalizeOptions(options, getCallSite())
		return await enumerate(optionsNormalized)
	}

	/**
	 * Enumerates routes and generates the index module. The resolved value can be passed to the constructor.
	 */
	static async write(
		options: Pick<Router.Options, "root" | "suffix" | "write"> = {},
	): Promise<Router.Routes> {
		const optionsNormalized = normalizeOptions(options, getCallSite())
		const { root, write } = optionsNormalized
		if (!write) throw new Error("`write` option cannot be falsy here.")
		const routes = await enumerate(optionsNormalized)
		await emit(root.pathname, routes, write)
		return routes
	}

	#routes: Router.Routes = []
	async #populateWithRoutetslist(routetslist: Routetslist): Promise<void | never> {
		this.#routes = routetslist.map(([pathname, route]) => {
			const pattern = new URLPatternPretty({ pathname })
			return [pathname, Object.assign(route, { pattern })]
		})
		logRoutes(this.#routes)
	}
	async #populateWithOptionsNormalized(
		optionsNormalized: OptionsNormalized,
	): Promise<void | never> {
		const { root, write, watch } = optionsNormalized
		this.#routes = await enumerate(optionsNormalized)
		if (write) await emit(root.pathname, this.#routes, write)
		logRoutes(this.#routes)
		if (watch.length) this.#watch(watch as [URL, ...URL[]], optionsNormalized)
	}

	/**
	 * An `AsyncIterable` that yields the file URLs of the changed files as per watch. If watching is disabled, returns immediately.
	 */
	watch: AsyncIterable<Set<URL>>
	#eventTarget: EventTarget | undefined
	async #watch(urls: [URL, ...URL[]], optionsNormalized: OptionsNormalized) {
		const { root, write } = optionsNormalized
		const { createGraph } = await import("https://jsr.io/@deno/graph/0.82.1/mod.ts")
		const { createCache } = await import("https://jsr.io/@deno/cache-dir/0.11.1/mod.ts")
		const { resolve, parse } = await import("https://esm.sh/v135/@import-maps/resolve@2.0.0")
		const { pick } = await import("https://jsr.io/@std/collections/1.0.5/pick.ts")
		const { filterValues } = await import("https://jsr.io/@std/collections/1.0.5/filter_values.ts")
		const importMap = optionsNormalized.importMap
			? parse(
					filterValues(
						pick(JSON.parse(await Deno.readTextFile(optionsNormalized.importMap)), [
							"imports",
							"scopes",
						]),
						value => value !== undefined,
					),
					optionsNormalized.importMap,
				)
			: {}
		const cache = createCache()
		while (
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
			true
		) {
			const routes = this.#routes.map(([path]) => toFileUrl(join(root.pathname, path)).href)
			const graph = await createGraph(routes, {
				...cache,
				kind: "codeOnly",
				resolve: (specifier, referrer) => {
					const result = resolve(specifier, importMap, new URL(referrer)).resolvedImport?.href
					if (result === undefined)
						throw new Error(`Cannot resolve specifier \`${specifier}\` from \`${referrer}\``)
					else return result
				},
			})
			const modules = new Map(
				graph.modules
					.filter(({ specifier }) => isFileUrl(specifier))
					.map(module => [module.specifier, module]),
			)
			const getDependents = (specifier: URL) =>
				[...modules.values()]
					.filter(
						module =>
							module.dependencies?.some(
								dependency => dependency.code?.specifier === specifier.href,
							),
					)
					.map(({ specifier }) => new URL(specifier))
			const getAffected = (specifier: URL) => {
				const affected = [specifier]
				for (const dependent of affected) affected.push(...getDependents(dependent))
				return [...new Set(affected)]
			}
			const modulePaths = [...modules.keys()].map(specifier =>
				decodeUriPathname(new URL(specifier).pathname),
			)
			try {
				const watcher = Deno.watchFs([...urls.map(url => url.pathname), ...modulePaths])
				for await (const event of watcher) {
					watcher.close()
					const routes = await enumerate(optionsNormalized)
					if (write) await emit(root.pathname, routes, write)
					logRoutes(routes, this.#routes)
					this.#routes = routes
					this.#eventTarget?.dispatchEvent(
						new CustomEvent<Set<URL>>("reload", {
							detail: new Set(event.paths.map(toFileUrl).flatMap(getAffected)),
						}),
					)
				}
			} catch (error) {
				console.error(error)
			}
		}
	}

	/**
	 * Creates a router instance that implements [`Deno.ServeHandler`](https://docs.deno.com/api/deno/~/Deno.ServeHandler).
	 *
	 * @example
	 * ```typescript
	 * await Deno.serve(new Router({ root: import.meta.resolve("./.") })).finished
	 * ```
	 */
	constructor(options: Router.Options | Routetslist = {}) {
		const callSite = getCallSite()
		let watch: boolean = false

		if (isRoutetslist(options)) {
			this.#populateWithRoutetslist(options)
		} else {
			const optionsNormalized = normalizeOptions(options, callSite)
			watch = 0 < optionsNormalized.watch.length
			this.#populateWithOptionsNormalized(optionsNormalized)
		}

		if (watch) {
			const eventTarget = new EventTarget()
			this.#eventTarget = eventTarget
			this.watch = {
				async *[Symbol.asyncIterator]() {
					const { subscribe } = await import(
						"https://deno.land/x/deno_event_iterator@v2.0.2/mod.ts"
					)
					for await (const event of subscribe.call(eventTarget, "reload"))
						yield (event as CustomEvent<Set<URL>>).detail
				},
			}
		} else {
			this.#eventTarget = undefined
			this.watch = {
				async *[Symbol.asyncIterator]() {},
			}
		}

		const handler = async (request: Request): Promise<Response> => {
			const url = new URL(request.url)
			for (const [path, route] of this.#routes) {
				const match = route.pattern.exec(url) ?? undefined
				if (match) {
					try {
						const captured = match.pathname.groups
						const pattern = new URLPattern(route.pattern)
						const response = await route({
							request,
							captured,
							path,
							pattern,
							router: this,
						})
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

		return Object.assign(Object.setPrototypeOf(handler, new.target.prototype), this)
	}
}

export default Router