import Route from "../src/Route.ts"
import { renderToStaticMarkup } from "https://esm.sh/react-dom@18.2.0/server"
import { ReactElement } from "https://esm.sh/react@18.2.0"

class RouteReact extends Route {
	constructor(handler: Route.Handler<ReactElement<unknown>>) {
		super(async context => {
			const response = await handler(context)
			return new Response(renderToStaticMarkup(response), {
				headers: { "Content-Type": "text/html" },
			})
		})
	}
}

export default RouteReact