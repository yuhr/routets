// SPDX-License-Identifier: CC0-1.0

import Route from "../src/Route.ts"

export default new Route(async () => {
	return new Response("Page not found.", { status: 404 })
})

export const precedence = 0