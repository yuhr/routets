namespace Route {
	export type Request = globalThis.Request
	export type Response = globalThis.Response
	export type Slugs = Record<string, string | undefined>
	export type Handler<
		AdditionalReturnType = never,
		AdditionalParameters extends readonly unknown[] = [],
	> = (
		request: Request,
		slugs: Slugs,
		...additionalParameters: AdditionalParameters
	) => Promise<Response | void | AdditionalReturnType>
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