// SPDX-License-Identifier: MPL-2.0

import { type ImportMap, type SpecifierMap } from "https://esm.sh/@import-maps/resolve@2.0.0"

const mapImportMap = (
	importMap: ImportMap,
	mapSpecifier: (key: string, value: string) => string | undefined
): ImportMap => {
	const result: ImportMap = {}
	if ("imports" in importMap) {
		result["imports"] = mapSpecifiers(importMap["imports"], mapSpecifier)
	}
	if ("scopes" in importMap) {
		result["scopes"] = Object.fromEntries(
			Object.entries(importMap["scopes"]).map(([key, value]) => [
				key,
				mapSpecifiers(value, mapSpecifier),
			])
		)
	}
	return result
}

const mapSpecifiers = (
	specifierMap: SpecifierMap,
	mapSpecifier: (key: string, value: string) => string | undefined
): SpecifierMap =>
	Object.fromEntries(
		Object.entries(specifierMap).flatMap(([key, value]) => {
			const result = mapSpecifier(key, value)
			if (result) return [[key, result]]
			else return []
		})
	)

export default mapImportMap