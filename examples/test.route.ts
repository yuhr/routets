// SPDX-License-Identifier: CC0-1.0

import Route from "routets/Route.ts"

// Returning `undefined` fallthroughs to the next matching route.
export default new Route(async () => {
	return undefined
})

export const precedence = 9