import Route from "../src/Route.ts"

// Returning nothing (i.e. `undefined`) fallthroughs to the next matching route.
export default new Route(async () => {})

export const precedence = 9