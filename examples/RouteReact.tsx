// SPDX-License-Identifier: CC0-1.0

import Route from "../src/Route.ts"
import { renderToReadableStream } from "https://esm.sh/react-dom@18.2.0/server"
import { type ReactElement, Suspense } from "https://esm.sh/react@18.2.0"

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
					</html>,
				),
				{ headers: { "Content-Type": "text/html" } },
			)
		})
	}
}

export default RouteReact