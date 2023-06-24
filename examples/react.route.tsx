import RouteReact from "./RouteReact.ts"

export default new RouteReact(async () => {
	return <b>Hello, World!</b>
})

export const precedence = 9