// SPDX-License-Identifier: MPL-2.0

import Route from "../../Route.ts"
import normalizeSpecifierLocal from "../../import-map/normalizeSpecifierLocal.ts"
import {
	type ServerSentEventMessage,
	ServerSentEventStream,
} from "https://esm.sh/jsr/@std/http@1.1.1/server_sent_event_stream.ts"

const headers = {
	"Content-Type": "text/event-stream",
} as const satisfies HeadersInit

const flatMap = async function* <T, U>(
	source: AsyncIterable<T>,
	transformer: (item: T) => U[] | Promise<U[]>
) {
	for await (const item of source) yield* await transformer(item)
}

// eslint-disable-next-line import/no-anonymous-default-export
export default new Route(async context => {
	const { request, updates, importMap } = context
	switch (request.method) {
		case "HEAD":
			return new Response(undefined, { headers })
		case "GET": {
			const stream =
				updates &&
				ReadableStream.from<ServerSentEventMessage>(
					flatMap(updates, update => {
						return [
							{
								data: JSON.stringify({
									type: "refresh",
									modules: [
										...update.any
											.values()
											.map(url => normalizeSpecifierLocal(url, importMap ?? {})),
									],
								}),
							},
						]
					})
				).pipeThrough(new ServerSentEventStream())
			return new Response(stream, { headers })
		}
		default:
			return new Response(undefined, { status: 405 })
	}
})