// SPDX-License-Identifier: CC0-1.0

import Route from "../src/Route.ts"

export default new Route(async () => {
	return new Response("Empty route name example.")
})

export const precedence = 1