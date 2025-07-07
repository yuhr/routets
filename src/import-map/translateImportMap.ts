// SPDX-License-Identifier: MPL-2.0

import isSpecifierRelative from "./isSpecifierRelative.ts"
import mapImportMap from "./mapImportMap.ts"
import { type ImportMap } from "https://esm.sh/@import-maps/resolve@2.0.0"
import { relative } from "https://esm.sh/jsr/@std/path@1.1.5/relative.ts"

const translateImportMap = (importMap: ImportMap, isIn: URL, asIn: URL): ImportMap =>
	mapImportMap(importMap, (key, specifier) => {
		if (isSpecifierRelative(specifier)) {
			const to = new URL(specifier, isIn)
			if (to.protocol === "file:")
				return relative(asIn.pathname, to.pathname) + (specifier.endsWith("/") ? "/" : "")
			else return to.href
		} else return specifier
	})

export default translateImportMap