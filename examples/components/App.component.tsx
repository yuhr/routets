// SPDX-License-Identifier: CC0-1.0

/* eslint-disable consistent-default-export-name/default-export-match-filename */

import { StrictMode, Suspense, useState } from "react"

const App = ({}: App.Props) => {
	const [count, setCount] = useState(0)

	return (
		<StrictMode>
			<Suspense fallback={<p>Loading...</p>}>
				<title>Hello, World!</title>
				{Date.now()} + {count}
				<button onClick={() => setCount(x => x + 1)}>increment</button>
			</Suspense>
		</StrictMode>
	)
}

namespace App {
	export type Props = object
}

export default App