// SPDX-License-Identifier: MPL-2.0

// routets-no-import-meta-hot

const consoleInfo = (message: string, ...args: unknown[]) =>
	console.info(`[HMR] ${message}`, ...args)
const consoleWarn = (message: string, ...args: unknown[]) =>
	console.warn(`[HMR] ${message}`, ...args)
const consoleError = (message: string, ...args: unknown[]) =>
	console.error(`[HMR] ${message}`, ...args)

const REGISTERED_MODULES = new Map<string, ImportMetaHot>()

type AcceptCallback = (args: { module: Record<string, unknown> }) => void | Promise<void>

const noop: AcceptCallback = () => {}

class ImportMetaHot {
	specifier: string
	acceptCallback: AcceptCallback | undefined

	constructor(specifier: string) {
		this.specifier = specifier
		const existing = REGISTERED_MODULES.get(specifier)
		if (existing) return existing
		consoleInfo("Registering module", specifier)
		REGISTERED_MODULES.set(specifier, this)
	}

	accept(callback?: AcceptCallback | undefined): void {
		if (!this.acceptCallback) {
			consoleInfo("Accepting module", this.specifier)
			this.acceptCallback = callback ?? noop
		}
	}

	static connectHmr = (endpointHmr: string) => {
		const source = new EventSource(endpointHmr)
		source.onopen = () => consoleInfo("Listening for file changes...")
		source.onerror = () => (source.onopen = () => location.reload())
		source.onmessage = async event => {
			const data = JSON.parse(event.data)
			consoleInfo(`Event received`, data)
			switch (data.type) {
				case "reload":
					location.reload()
					break
				case "refresh":
					try {
						for (const specifier of data.modules) {
							const { acceptCallback } = REGISTERED_MODULES.get(specifier) ?? {}
							if (typeof acceptCallback === "function") {
								const module: Record<string, unknown> = await import(
									`${specifier}?timestamp=${Date.now()}`
								)
								await acceptCallback({ module })
							} // else location.reload()
						}
					} catch (error) {
						consoleError("Refresh failed", error)
					}
					break
				default:
					consoleWarn("Unknown event received", data)
			}
		}
	}
}

export default ImportMetaHot