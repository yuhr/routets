// SPDX-License-Identifier: MPL-2.0

import Route from "../../Route.ts"
import { type ParsedImportMap, resolve } from "https://esm.sh/@import-maps/resolve@2.0.0"

class RouteModule extends Route {
	constructor(
		options: {
			transformer?: (module: {
				specifier: URL
				importMap: ParsedImportMap
				content: string
			}) => Promise<string> | string
		} = {}
	) {
		super(async context => {
			const { request, root, importMap } = context
			const { transformer = ({ content }) => content } = options
			const specifierOriginal = context.captured["specifier"]!
			const specifier = resolve(specifierOriginal, importMap, root).resolvedImport!
			switch (request.method) {
				case "HEAD":
				case "GET": {
					const content = await Deno.readTextFile(specifier)
					const transformed = await transformer({ specifier, importMap, content })
					return new Response(transformed, {
						headers: {
							"Content-Type": "text/javascript",
							"Cache-Control": "no-cache",
						},
					})
				}
				default:
					return new Response(undefined, { status: 405 })
			}
		})
	}
}

export default RouteModule