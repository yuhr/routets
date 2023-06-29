import Route from "../src/Route.ts"

export default new Route(async ({ captured }) => {
	return new Response(JSON.stringify(captured), { headers: { "Content-Type": "application/json" } })
})

export const precedence = 1