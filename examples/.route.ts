// SPDX-License-Identifier: CC0-1.0

import Route from "routets/Route.ts"

export default new Route(async context => {
	return new Response("Empty route name example.")
})

export const precedence = 1