import Route from "../src/Route.ts"
import { renderToStaticMarkup } from "https://esm.sh/react-dom@18.2.0/server"
import React, { isValidElement } from "https://esm.sh/react@18.2.0"

class RouteReact extends Route {
	constructor(handler: Route.Handler<React.ReactElement<unknown>>) {
		super(async context => {
			const response = await handler(context)
			if (isValidElement(response))
				return new Response(renderToStaticMarkup(response), {
					headers: { "Content-Type": "text/html; charset=utf-8" },
				})
			return response
		})
	}
}

export default RouteReact