// SPDX-License-Identifier: MPL-2.0

import isSpecifierUrl from "./isSpecifierUrl.ts"
import { isAbsolute } from "https://esm.sh/jsr/@std/path@1.1.5/is_absolute.ts"

const isSpecifierRelative = (specifier: string): boolean => {
	if (isSpecifierUrl(specifier)) return false
	else if (isAbsolute(specifier)) return false
	else return true
}

export default isSpecifierRelative