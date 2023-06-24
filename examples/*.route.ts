import Route from "../src/Route.ts"

export default new Route(async () => {
	return new Response("Page not found.", { status: 404 })
})