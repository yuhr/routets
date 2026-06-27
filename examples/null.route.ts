// SPDX-License-Identifier: CC0-1.0

import Route from "routets/Route.ts"

// @ts-expect-error: Testing a return type other than `Response` or `undefined`. This will cause a 500.
export default new Route(async () => {
	return null
})