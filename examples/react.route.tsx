// SPDX-License-Identifier: CC0-1.0

import RouteReact from ".../RouteReact.tsx"
// eslint-disable-next-line consistent-default-export-name/default-import-match-filename
import App from ".../components/App.component.tsx"

export default new RouteReact(async () => {
	return <App />
})