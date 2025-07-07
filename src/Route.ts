// SPDX-License-Identifier: MPL-2.0

import type Router from "./Router.ts"
import { type ImportMap, type ParsedImportMap } from "https://esm.sh/@import-maps/resolve@2.0.0"

namespace Route {
	export type Captured = Readonly<Record<string, string | undefined>>

	export type Update = Readonly<{
		added: Set<URL>
		removed: Set<URL>
		changed: Set<URL>
		affected: Set<URL>
		any: Set<URL>
	}>

	export type Context = Readonly<{
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
		/** The file URL of the serving root directory. */
		root: URL
		/** The parsed import map specified in the `Router` constructor. Values are all absolute URLs. */
		importMap: ParsedImportMap
		/** The original import map specified in the `Router` constructor. */
		importMapOriginal: ImportMap
		/** The translated import map as if it was placed at the route module. Useful for rendering the client side import map. */
		importMapTranslated: ImportMap
		/** An `AsyncIterator` that notifies any events happened on watching files. Present only when watching. */
		updates: AsyncIterable<Update> | undefined
	}>

	export type Handler<
		ReturnType = Response | void,
		AdditionalParameters extends readonly unknown[] = [],
	> = (context: Context, ...additionalParameters: AdditionalParameters) => Promise<ReturnType>
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging, @typescript-eslint/no-empty-object-type
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

const symbol = Symbol.for("routets/Route")

export default Route