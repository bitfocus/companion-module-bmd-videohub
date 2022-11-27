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
	index: number
	label: string
	name: string
	route: number
	status: string // TODO - type better?
	// lock: string // TODO - type better?
	fallback: number[]
	type: 'primary' | 'monitor'
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

export interface QueueOperation {
	cmd: string
	dest: number
	src: number | undefined
}

export class VideohubState {
	selectedDestination: number | undefined
	queuedOp: QueueOperation | undefined

	#inputs: InputState[]
	#primaryOutputs: OutputState[]
	#monitorOutputs: OutputState[]
	#serials: SerialState[]

	constructor() {
		this.#inputs = []
		this.#primaryOutputs = []
		this.#monitorOutputs = []
		this.#serials = []

		this.updateCounts({})
	}

	public updateCounts(config: VideoHubConfig): void {
		const inputCount = Number(config.inputCount || 12)
		const outputCount = Number(config.outputCount || 12)
		const monitoringCount = Number(config.monitoringCount || 0)
		const serialCount = Number(config.serialCount || 0)

		this.#inputs = this.#inputs.slice(0, inputCount)
		for (let id = this.#inputs.length; id < inputCount; id++) {
			this.#inputs.push({
				id,
				label: `${id + 1}: Input ${id + 1}`,
				name: `Input ${id + 1}`,
				status: 'BNC',
				// lock: 'U',
			})
		}

		this.#serials = this.#serials.slice(0, serialCount)
		for (let id = this.#serials.length; id < serialCount; id++) {
			this.#serials.push({
				id,
				label: `${id + 1}: Serial ${id + 1}`,
				name: `Serial ${id + 1}`,
				route: id,
				status: 'RS422',
				// lock: 'U',
				// directions: 'auto',
			})
		}

		this.#primaryOutputs = this.#primaryOutputs.slice(0, outputCount)
		for (let id = this.#primaryOutputs.length; id < outputCount; id++) {
			this.#primaryOutputs.push({
				id,
				index: id,
				label: `${id + 1}: Output ${id + 1}`,
				name: `Output ${id + 1}`,
				route: id,
				status: 'BNC',
				// lock: 'U',
				fallback: [],
				type: 'primary',
			})
		}

		this.#monitorOutputs = this.#monitorOutputs.slice(0, monitoringCount)
		for (let id = this.#monitorOutputs.length; id < monitoringCount; id++) {
			this.#monitorOutputs.push({
				id,
				index: id,
				label: `${id + 1}: Output ${id + 1}`,
				name: `Output ${id + 1}`,
				route: id,
				status: 'BNC',
				// lock: 'U',
				fallback: [],
				type: 'monitor',
			})
		}
		for (let index = 0; index < this.#monitorOutputs.length; index++) {
			this.#monitorOutputs[index].id = this.#primaryOutputs.length + index
		}
	}

	public get allOutputsCount(): number {
		return this.#monitorOutputs.length + this.#primaryOutputs.length
	}

	/**
	 * INTERNAL: returns the desired input object.
	 *
	 * @param id - the input to fetch
	 * @returns the desired input object
	 */
	public getInput(id: number): InputState | undefined {
		return this.#inputs[id]
	}

	/**
	 * INTERNAL: returns the desired output object.
	 *
	 * @param id - the output to fetch
	 * @returns the desired output object
	 */
	public getOutputById(id: number): OutputState | undefined {
		if (id >= this.#primaryOutputs.length) {
			return this.#monitorOutputs[id - this.#primaryOutputs.length]
		} else {
			return this.#primaryOutputs[id]
		}
	}

	public getPrimaryOutput(id: number): OutputState | undefined {
		return this.#primaryOutputs[id]
	}

	public getMonitoringOutput(id: number): OutputState | undefined {
		return this.#monitorOutputs[id]
	}

	public getSelectedOutput(): OutputState | undefined {
		return this.selectedDestination !== undefined ? this.getOutputById(this.selectedDestination) : undefined
	}

	/**
	 * INTERNAL: returns the desired serial port object.
	 *
	 * @param id - the serial port to fetch
	 * @returns the desired serial port object
	 */
	public getSerial(id: number): SerialState | undefined {
		return this.#serials[id]
	}

	public iterateInputs(): InputState[] {
		return this.#inputs
	}

	public iterateAllOutputs(): OutputState[] {
		return [...this.#primaryOutputs, ...this.#monitorOutputs]
	}

	public iterateSerials(): SerialState[] {
		return this.#serials
	}
}
