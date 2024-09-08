import type Router from "./Router.ts"

namespace Route {
	export type Captured = Record<string, string | undefined>

	export type Context = {
		/** The original `Request` object. */
		request: Request
		/** The captured substrings of the pathname. */
		captured: Captured
		/** The relative path to the route file from the serving root directory, including the suffix and the extension. */
		path: string
		/** A clone of the instance of `URLPattern` that is used to match this route. */
		pattern: URLPattern
		/** The `Router` instance that is serving the route. */
		router: Router
	}

	export type Handler<
		ReturnType = Response | void,
		AdditionalParameters extends readonly unknown[] = [],
	> = (context: Context, ...additionalParameters: AdditionalParameters) => Promise<ReturnType>
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
interface Route extends Route.Handler {}

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
class Route {
	constructor(handler: Route.Handler) {
		return Object.defineProperty(Object.setPrototypeOf(handler, new.target.prototype), symbol, {
			value: undefined,
			configurable: false,
			enumerable: false,
			writable: false,
		})
	}

	static isRoute(value: unknown): value is Route {
		return typeof value === "function" && symbol in value
	}
}

const symbol = Symbol()

export default Route