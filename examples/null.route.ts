import Route from "../src/Route.ts"

// @ts-expect-error: Testing a return type other than `Response` or `undefined`. This will cause a 500.
export default new Route(async () => {
	return null
})

export const precedence = 9