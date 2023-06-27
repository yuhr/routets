namespace Route {
	export type Slugs = Record<string, string | undefined>
	export type Context = { request: Request; slugs: Slugs }
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