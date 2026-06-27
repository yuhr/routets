// SPDX-License-Identifier: CC0-1.0

import Route from "routets/Route.ts"

// Throwing will result in a 500.
export default new Route(async () => {
	throw undefined
})