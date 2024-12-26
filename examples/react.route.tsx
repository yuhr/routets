// SPDX-License-Identifier: CC0-1.0

import RouteReact from "./RouteReact.tsx"
import { delay } from "https://jsr.io/@std/async/1.0.9/delay.ts"

let done = false
const Component = () => {
	if (!done) {
		throw delay(3000).then(() => (done = true))
	} else {
		done = false
		return <b>Hello, World!</b>
	}
}

export default new RouteReact(async () => {
	return <Component />
})

export const precedence = 9