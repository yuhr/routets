import Route from "../src/Route.ts"

export default new Route(async (request, slugs) => {
	return new Response(JSON.stringify(slugs), { headers: { "Content-Type": "application/json" } })
})

export const precedence = 1