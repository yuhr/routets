// SPDX-License-Identifier: MPL-2.0

import normalizeSpecifierLocal from "../../../../import-map/normalizeSpecifierLocal.ts"
import { type ParsedImportMap } from "https://esm.sh/@import-maps/resolve@2.0.0"

const transformForFastRefresh = ({
	specifier,
	importMap,
	content,
}: {
	specifier: URL
	importMap: ParsedImportMap
	content: string
}) => {
	const specifierNormal = normalizeSpecifierLocal(specifier, importMap)
	const specifierNormalQuoted = JSON.stringify(specifierNormal)
	return `
const $RefreshRegPrev$ = window.$RefreshReg$
const $RefreshSigPrev$ = window.$RefreshSig$
window.$RefreshReg$ = (type, id) => window.$RefreshRuntime$.register(type, ${specifierNormalQuoted} + " " + id)
window.$RefreshSig$ = window.$RefreshRuntime$.createSignatureFunctionForTransform

${content.trim()}

window.$RefreshReg$ = $RefreshRegPrev$
window.$RefreshSig$ = $RefreshSigPrev$
import.meta.hot.accept(({ module }) => {
	try {
		console.info("[HMR] React-fast-refreshing", ${specifierNormalQuoted})
		window.$RefreshRuntime$.performReactRefresh()
	} catch (error) {
		console.error(error)
		location.reload()
	}
})
`.trim()
}

export default transformForFastRefresh