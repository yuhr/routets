import Route from "../src/Route.ts"

// Returning `undefined` fallthroughs to the next matching route.
export default new Route(async () => {
	return undefined
})

export const precedence = 9