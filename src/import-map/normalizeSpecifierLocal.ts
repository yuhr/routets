// SPDX-License-Identifier: MPL-2.0

import { type ParsedImportMap } from "https://esm.sh/@import-maps/resolve@2.0.0"

const normalizeSpecifierLocal = (resolved: URL, importMap: ParsedImportMap): string => {
	if (resolved.protocol === "file:")
		for (const [key, value] of Object.entries(importMap.imports ?? {}))
			if (value?.protocol === "file:" && resolved.pathname.startsWith(value.pathname))
				return key + resolved.pathname.substring(value.pathname.length)
	return resolved.href
}

export default normalizeSpecifierLocal