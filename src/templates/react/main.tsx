// SPDX-License-Identifier: CC0-1.0

/// <reference lib="dom" />

// routets-no-import-meta-hot

import "routets/hmr/client/ext/react/preamble.ts"
// eslint-disable-next-line consistent-default-export-name/default-import-match-filename
import App from ".../components/App.component.tsx"
import { createRoot } from "react-dom/client"
import ImportMetaHot from "routets/hmr/client/ImportMetaHot.ts"

ImportMetaHot.connectHmr("/.routets/hmr")

createRoot(document.body).render(<App />)