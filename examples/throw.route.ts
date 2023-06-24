import Route from "../src/Route.ts"

// Throwing will result in a 500.
export default new Route(async () => {
	throw undefined
})