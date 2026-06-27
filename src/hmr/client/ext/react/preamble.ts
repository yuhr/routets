// SPDX-License-Identifier: MPL-2.0

// routets-no-import-meta-hot

// eslint-disable-next-line consistent-default-export-name/default-import-match-filename
import RefreshRuntime from "react-refresh/runtime"

declare global {
	interface Window {
		$RefreshReg$: (type: unknown, id: string) => void
		$RefreshSig$: () => (type: unknown) => unknown
		$RefreshRuntime$: typeof RefreshRuntime
	}
}

RefreshRuntime.injectIntoGlobalHook(window)
window.$RefreshReg$ = () => {}
window.$RefreshSig$ = () => type => type
window.$RefreshRuntime$ = RefreshRuntime