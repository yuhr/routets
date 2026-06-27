// SPDX-License-Identifier: MPL-2.0

const isSpecifierUrl = (specifier: string): boolean => {
	try {
		new URL(specifier)
		return true
	} catch (error) {
		return false
	}
}

export default isSpecifierUrl