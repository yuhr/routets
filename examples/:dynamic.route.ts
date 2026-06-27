// SPDX-License-Identifier: CC0-1.0

import Route from "routets/Route.ts"

export default new Route(async ({ captured }) => {
	return new Response(JSON.stringify(captured), { headers: { "Content-Type": "application/json" } })
})