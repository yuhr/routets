namespace Route {
	export type Captured = Record<string, string | undefined>
	/** @deprecated Use {@link Captured `Captured`} instead. */
	export type Slugs = Record<string, string | undefined>
	export type Context = {
		/** The original `Request` object. */
		request: Request
		/** The captured substrings of the pathname. */
		captured: Captured
		/** @deprecated Use {@link Context.captured `captured`} instead. */
		slugs: Slugs
		/** The relative path to the route file from the serving root directory, including the suffix and the extension. */
		path: string
		/** A clone of the instance of `URLPattern` that is used to match this route. */
		pattern: URLPattern
	}
	export type Handler<
		ReturnType = Response | void,
		AdditionalParameters extends readonly unknown[] = [],
	> = (context: Context, ...additionalParameters: AdditionalParameters) => Promise<ReturnType>
}

interface Route extends Route.Handler {}

class Route {
	constructor(handler: Route.Handler) {
		return Object.defineProperty(
			Object.setPrototypeOf(handler, new.target.prototype),
			Symbol.for("routets"),
			{ value: undefined, configurable: false, enumerable: false, writable: false },
		)
	}
	static isRoute(value: unknown): value is Route {
		return typeof value === "function" && Symbol.for("routets") in value
	}
}

export default Route