// SPDX-License-Identifier: CC0-1.0

import Route from "../../src/Route.ts"

export default new Route(async () => {
	return new Response(
		"Dynamic route with optional trailing `/*` e.g. `/api` or `/api/` or `/api/foo`.",
		{ status: 404 },
	)
})