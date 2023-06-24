import RouteReact from "../src/Route.ts"

// Returning nothing (i.e. `undefined`) fallthroughs to the next matching route.
export default new RouteReact(async () => {})