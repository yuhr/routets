// SPDX-License-Identifier: CC0-1.0

import RouteModule from "routets/hmr/server/RouteModule.ts"
import transformForFastRefresh from "routets/hmr/server/ext/react/transformForFastRefresh.ts"
import compile from "routets/compiler/compile.ts"

export default new RouteModule({
	transformer: async module => {
		// Compile TypeScript modules to ECMAScript.
		const content = await compile(module)
		// And then decorate React components with fast refresh wrapper.
		return /\.component\.tsx$/.test(module.specifier.pathname)
			? transformForFastRefresh({ ...module, content })
			: content
	},
})