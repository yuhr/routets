// SPDX-License-Identifier: CC0-1.0

import { type ReactElement } from "react"
import { renderToReadableStream } from "react-dom/server"
import Route from "routets/Route.ts"
import isSpecifierUrl from "routets/import-map/isSpecifierUrl.ts"
import mapImportMap from "routets/import-map/mapImportMap.ts"

class RouteReact extends Route {
	constructor(handler: Route.Handler<ReactElement<unknown>>) {
		super(async context => {
			const response = await handler(context)
			const importMap = mapImportMap(context.importMapTranslated, (key, value) =>
				isSpecifierUrl(value) ? value : `/.routets/module/${key}`
			)
			return new Response(
				await renderToReadableStream(
					<>
						<script type="importmap">{JSON.stringify(importMap)}</script>
						<script type="module" src="/.routets/module/.../main.tsx" />
						{response}
					</>
				),
				{ headers: { "Content-Type": "text/html" } }
			)
		})
	}
}

export default RouteReact