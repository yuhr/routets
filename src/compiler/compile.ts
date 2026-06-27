// SPDX-License-Identifier: MPL-2.0

import normalizeSpecifierLocal from "../import-map/normalizeSpecifierLocal.ts"
import { type ParsedImportMap } from "https://esm.sh/@import-maps/resolve@2.0.0"
import init, {
	transform,
	parse,
	type ParseOptions,
	type Options as TransformOptions,
} from "https://esm.sh/@swc/wasm-web@1.13.3"

await init()

const parseOptions = {
	syntax: "typescript",
	tsx: true,
	dynamicImport: true,
	target: "es2022",
} as const satisfies ParseOptions

const transformOptions = {
	module: { type: "es6" },
	jsc: {
		parser: { syntax: "typescript", tsx: true, dynamicImport: true },
		transform: {
			react: { runtime: "automatic", importSource: "react", refresh: true, development: true },
		},
	},
	env: {
		targets: "defaults",
		mode: "usage",
		coreJs: "3.26.1",
	},
} as const satisfies TransformOptions

const compile = async (options: {
	specifier: URL
	importMap: ParsedImportMap
	content: string
}): Promise<string> => {
	const { specifier, importMap, content } = options
	const ast = await parse(content, parseOptions)
	let code = (await transform(ast, transformOptions)).code.trim()

	if (!content.includes("routets-no-import-meta-hot")) {
		const urlImportMetaHot = new URL(import.meta.resolve("routets/hmr/client/ImportMetaHot.ts"))
		const specifierImportMetaHot =
			urlImportMetaHot.protocol === "file:"
				? normalizeSpecifierLocal(urlImportMetaHot, importMap)
				: urlImportMetaHot.href
		const specifierNormal = normalizeSpecifierLocal(specifier, importMap)
		code =
			`import.meta.hot = new (await import(${JSON.stringify(
				specifierImportMetaHot
			)})).default(${JSON.stringify(specifierNormal)});\n\n` + code
	}

	return code
}

export default compile