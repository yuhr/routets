// SPDX-License-Identifier: CC0-1.0

import Route from "../src/Route.ts"

// Returning nothing (i.e. `undefined`) fallthroughs to the next matching route.
export default new Route(async () => {})