import { VideoHubConfig } from './config'

export interface InputState {
	id: number
	label: string
	name: string
	status: string // TODO - type better?
	// lock: string // TODO - type better?
}
export interface OutputState {
	id: number
	label: string
	name: string
	route: number
	status: string // TODO - type better?
	// lock: string // TODO - type better?
	fallback: number[]
}
export interface SerialState {
	id: number
	label: string
	name: string
	route: number
	status: string // TODO - type better?
	// lock: string // TODO - type better?
	// directions: string // TODO - type better?
}

export class VideohubState {
	inputCount!: number
	outputCount!: number
	monitoringCount!: number
	serialCount!: number

	selectedDestination: number = 0 // TODO make optional?
	queuedDest: number = 0 // TODO make optional?
	queuedSource: number = 0 // TODO make optional?
	queue: string = '' // TODO make optional?

	#inputs: Map<number, InputState>
	#outputs: Map<number, OutputState>
	#serials: Map<number, SerialState>

	constructor() {
		this.#inputs = new Map()
		this.#outputs = new Map()
		this.#serials = new Map()

		this.updateCounts({})
	}

	public updateCounts(config: VideoHubConfig): void {
		this.inputCount = Number(config.inputCount || 12)
		this.outputCount = Number(config.outputCount || 12)
		this.monitoringCount = Number(config.monitoringCount || 0)
		this.serialCount = Number(config.serialCount || 0)

		// TODO
	}

	/**
	 * INTERNAL: returns the desired input object.
	 *
	 * @param id - the input to fetch
	 * @returns the desired input object
	 */
	public getInput(id: number): InputState {
		let input = this.#inputs.get(id)
		if (!input) {
			input = {
				id,
				label: `${id + 1}: Input ${id + 1}`,
				name: `Input ${id + 1}`,
				status: 'BNC',
				// lock: 'U',
			}
			this.#inputs.set(id, input)
		}

		return input
	}

	/**
	 * INTERNAL: returns the desired output object.
	 *
	 * @param id - the output to fetch
	 * @returns the desired output object
	 */
	public getOutput(id: number): OutputState {
		let output = this.#outputs.get(id)
		if (!output) {
			output = {
				id,
				label: `${id + 1}: Output ${id + 1}`,
				name: `Output ${id + 1}`,
				route: id,
				status: 'BNC',
				// lock: 'U',
				fallback: [-1],
			}
			this.#outputs.set(id, output)
		}

		return output
	}

	public getMonitoringOutput(id: number): OutputState {
		return this.getOutput(id + this.monitoringCount)
	}

	public getSelectedOutput(): OutputState | undefined {
		return this.#outputs.get(this.selectedDestination)
	}

	/**
	 * INTERNAL: returns the desired serial port object.
	 *
	 * @param id - the serial port to fetch
	 * @returns the desired serial port object
	 */
	public getSerial(id: number) {
		let serial = this.#serials.get(id)
		if (!serial) {
			serial = {
				id,
				label: `${id + 1}: Serial ${id + 1}`,
				name: `Serial ${id + 1}`,
				route: id,
				status: 'RS422',
				// lock: 'U',
				// directions: 'auto',
			}
		}

		return serial
	}

	public *iterateInputs(): Iterable<InputState> {
		for (let key = 0; key < this.inputCount; key++) {
			yield this.getInput(key)
		}
	}
	public *iterateOutputs(): Iterable<OutputState> {
		for (let key = 0; key < this.outputCount + this.monitoringCount; key++) {
			yield this.getOutput(key)
		}
	}
	public *iterateSerials(): Iterable<SerialState> {
		for (let key = 0; key < this.serialCount; key++) {
			yield this.getSerial(key)
		}
	}
}
