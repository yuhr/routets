import Route from "../../src/Route.ts"

export default new Route(async () => {
	return new Response("Hello from API!")
})