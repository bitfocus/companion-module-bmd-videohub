import type { CompanionVariableValues } from '@companion-module/base'
import type { InputState, LockState, OutputState, SerialState, VideohubState } from './state.js'
import type { InstanceBaseExt } from './types.js'
import { updateSelectedDestinationVariables } from './variables.js'
import { LOCKSTATES } from './choices.js'

/**
 * INTERNAL: Updates device data from the Videohub
 *
 * @param labeltype - the command/data type being passed
 * @param data - the collected data
 */
export function updateDevice(self: InstanceBaseExt, _labeltype: string, data: string[]): void {
	for (const line of data) {
		const [attribute, ...values] = line.split(/: /)
		const value = values.join(' ')

		switch (attribute) {
			case 'Model name':
				self.log('info', 'Connected to a ' + value)
				break
			case 'Video inputs':
				self.config.inputCount = Number(value)
				break
			case 'Video outputs':
				self.config.outputCount = Number(value)
				break
			case 'Video monitoring outputs':
				self.config.monitoringCount = Number(value)
				break
			case 'Serial ports':
				self.config.serialCount = Number(value)
				break
		}
	}

	self.saveConfig(self.config)

	self.state.updateCounts(self.config)

	self.initThings(true)
}

/**
 * INTERNAL: Updates variables based on data from the Videohub
 *
 * @param {string} labeltype - the command/data type being passed
 * @param {Object} object - the collected data
 */
export function updateLabels(self: InstanceBaseExt, state: VideohubState, labeltype: string, data: string[]) {
	const variableValues: CompanionVariableValues = {}

	for (const line of data) {
		const [numStr, ...values] = line.split(/ /)
		let num = parseInt(numStr)
		const label = values.join(' ')

		switch (labeltype) {
			case 'INPUT LABELS': {
				const input = state.getInput(num)
				if (input) {
					input.name = label
					input.label = `${num + 1}: ${label}`
					variableValues[`input_${num + 1}`] = label
				}
				break
			}
			case 'MONITORING OUTPUT LABELS': {
				const output = state.getMonitoringOutput(num)
				if (output) {
					output.name = label
					output.label = `${num + 1}: ${label}`
					variableValues[`output_${num + 1}`] = label
				}
				break
			}
			case 'OUTPUT LABELS': {
				const output = state.getPrimaryOutput(num)
				if (output) {
					output.name = label
					output.label = `${num + 1}: ${label}`
					variableValues[`output_${num + 1}`] = label
				}
				break
			}
			case 'SERIAL PORT LABELS': {
				const serial = state.getSerial(num)
				if (serial) {
					serial.name = label
					serial.label = `${num + 1}: ${label}`
					variableValues[`serial_${num + 1}`] = label
				}
				break
			}
		}
	}

	if (labeltype == 'INPUT LABELS') {
		for (const output of state.iterateAllOutputs()) {
			if (output.status != 'None') {
				variableValues[`output_${output.outputId + 1}_input`] = state.getInput(output.route)?.name ?? '?'
			}
		}
	}

	updateSelectedDestinationVariables(state, variableValues)

	self.setVariableValues(variableValues)
}

/**
 * INTERNAL: Updates lock states based on data from the Videohub
 *
 * @param {string} labeltype - the command/data type being passed
 * @param {Object} lines - the collected data
 * @access protected
 * @since 1.1.0
 */
export function updateLocks(self: InstanceBaseExt, labeltype: string, lines: string[]) {
	const state = self.state
	const variableValues: CompanionVariableValues = {}

	for (const line of lines) {
		const parts = line.split(/ /)
		const index = Number(parts[0])
		const lock_state = parts[1] as LockState

		switch (labeltype) {
			case 'MONITORING OUTPUT LOCKS': {
				const output = state.getMonitoringOutput(index)
				if (output) {
					output.lock = lock_state
					variableValues[`output_${output.outputId + 1}_lock_state`] = LOCKSTATES[lock_state]
				}
				break
			}
			case 'VIDEO OUTPUT LOCKS': {
				const output = state.getPrimaryOutput(index)
				if (output) {
					output.lock = lock_state
					variableValues[`output_${output.outputId + 1}_lock_state`] = LOCKSTATES[lock_state]
				}
				break
			}
			case 'SERIAL PORT LOCKS': {
				const serial = state.getSerial(index)
				if (serial) {
					serial.lock = lock_state
					variableValues[`serial_${serial.id + 1}_lock_state`] = LOCKSTATES[lock_state]
				}
				break
			}
		}
		self.setVariableValues(variableValues)
	}
}

/**
 * INTERNAL: Updates Companion's routing table based on data sent from the Videohub
 *
 * @param {string} labeltype - the command/data type being passed
 * @param {Object} object - the collected data
 */
export function updateRouting(self: InstanceBaseExt, state: VideohubState, labeltype: string, data: string[]) {
	const variableValues: CompanionVariableValues = {}

	for (const line of data) {
		const [destStr, srcStr] = line.split(/ /)
		const dest = parseInt(destStr)
		const src = parseInt(srcStr)

		switch (labeltype) {
			case 'VIDEO MONITORING OUTPUT ROUTING': {
				const output = state.getMonitoringOutput(dest)
				if (output) {
					// Lets not let the fallback array grow without bounds. is 20 enough?
					if (output.fallback.length > 20) {
						output.fallback = output.fallback.slice(2)
					}
					output.fallback.push(src) // push the route returned from the hardware into the fallback route
					output.route = src // now we set the route in the container to the new value

					variableValues[`output_${dest + 1}_input`] = state.getInput(src)?.name ?? '?'
					variableValues[`output_${dest + 1}_input_id`] = src + 1
				}
				break
			}
			case 'VIDEO OUTPUT ROUTING': {
				const output = state.getPrimaryOutput(dest)
				if (output) {
					// Lets not let the fallback array grow without bounds. is 20 enough?
					if (output.fallback.length > 20) {
						output.fallback = output.fallback.slice(2)
					}
					output.fallback.push(src) // push the route returned from the hardware into the fallback route
					output.route = src // now we set the route in the container to the new value

					variableValues[`output_${dest + 1}_input`] = state.getInput(src)?.name ?? '?'
					variableValues[`output_${dest + 1}_input_id`] = src + 1
				}
				break
			}
			case 'SERIAL PORT ROUTING': {
				const serial = state.getSerial(dest)
				if (serial) {
					serial.route = src
					variableValues[`serial_${dest + 1}_route`] = state.getSerial(src)?.name ?? '?'
				}
				break
			}
		}
	}

	updateSelectedDestinationVariables(state, variableValues)

	self.setVariableValues(variableValues)
	self.checkFeedbacks('input_bg', 'selected_source', 'input_bg_dyn', 'selected_source_dyn')
}

// /**
//  * INTERNAL: Updates serial port directions based on data from the Videohub
//  *
//  * @param {string} labeltype - the command/data type being passed
//  * @param {Object} object - the collected data
//  * @access protected
//  * @since 1.1.0
//  */
// export function updateSerialDirections(self: InstanceBaseExt, state: VideohubState, labeltype: string, object) {
// 	for (var key in object) {
// 		var parsethis = object[key]
// 		var a = parsethis.split(/ /)
// 		var num = parseInt(a.shift())
// 		var type = a.join(' ')

// 		switch (labeltype) {
// 			case 'SERIAL PORT DIRECTIONS':
// 				state.getSerial(num).direction = type
// 				break
// 		}
// 	}
// }

/**
 * INTERNAL: Updates variables based on data from the Videohub
 *
 * @param {string} labeltype - the command/data type being passed
 * @param {Object} object - the collected data
 */
export function updateStatus(_self: InstanceBaseExt, state: VideohubState, labeltype: string, data: string[]) {
	for (const line of data) {
		const [numStr, ...values] = line.split(/ /)
		let num = parseInt(numStr)
		const label = values.join(' ')

		switch (labeltype) {
			case 'VIDEO INPUT STATUS': {
				const input = state.getInput(num)
				if (input) input.status = label
				break
			}
			case 'VIDEO OUTPUT STATUS': {
				const output = state.getOutputById(num)
				if (output) output.status = label
				break
			}
			case 'SERIAL PORT STATUS': {
				const serial = state.getSerial(num)
				if (serial) serial.status = label
				break
			}
		}
	}
}

export class VideohubApi {
	#self: InstanceBaseExt

	constructor(self: InstanceBaseExt) {
		this.#self = self
	}

	#sendCommand(cmd: string) {
		if (this.#self.socket !== undefined && this.#self.socket.isConnected) {
			try {
				this.#self.log('debug', 'TCP sending ' + cmd)
				this.#self.socket.send(cmd)
			} catch (error: any) {
				this.#self.log('error', 'TCP error ' + error.message)
			}
		} else {
			this.#self.log('error', 'Socket not connected ')
			this.#self.init_tcp()
		}
	}

	/*
	 * Note: all the methods here are promise based to prepare for the future when we will detect if the command was successful
	 */

	async setOutputLabel(output: OutputState, name: string): Promise<void> {
		if (output.type === 'monitor') {
			this.#sendCommand('MONITORING OUTPUT LABELS:\n' + output.id + ' ' + name + '\n\n')
		} else {
			this.#sendCommand('OUTPUT LABELS:\n' + output.id + ' ' + name + '\n\n')
		}
	}

	async setInputLabel(input: InputState, name: string): Promise<void> {
		this.#sendCommand('INPUT LABELS:\n' + input.id + ' ' + name + '\n\n')
	}

	async setSerialLabel(serial: SerialState, name: string): Promise<void> {
		this.#sendCommand('SERIAL PORT LABELS:\n' + serial.id + ' ' + name + '\n\n')
	}

	async setOutputRoute(output: OutputState, source: number, ignoreLock: boolean): Promise<void> {
		if (output.lock !== 'U' && !ignoreLock) return

		if (output.type === 'monitor') {
			this.#sendCommand('VIDEO MONITORING OUTPUT ROUTING:\n' + output.id + ' ' + source + '\n\n')
		} else {
			this.#sendCommand('VIDEO OUTPUT ROUTING:\n' + output.id + ' ' + source + '\n\n')
		}
	}

	async setSerialRoute(serial: SerialState, source: number, ignoreLock: boolean): Promise<void> {
		if (serial.lock !== 'U' && !ignoreLock) return

		this.#sendCommand('SERIAL PORT ROUTING:\n' + serial.id + ' ' + source + '\n\n')
	}

	async setMultipleOutputRoutes(routes: Map<OutputState, number>): Promise<void> {
		const primaryRoutes: string[] = []
		const monitorRoutes: string[] = []

		for (const [output, source] of routes) {
			if (output.type === 'monitor') {
				monitorRoutes.push(`${output.id} ${source}`)
			} else {
				primaryRoutes.push(`${output.id} ${source}`)
			}
		}

		if (primaryRoutes.length > 0) {
			this.#sendCommand(`VIDEO OUTPUT ROUTING:\n${primaryRoutes.join('\n')}\n\n`)
		}
		if (monitorRoutes.length > 0) {
			this.#sendCommand(`VIDEO MONITORING OUTPUT ROUTING:\n${monitorRoutes.join('\n')}\n\n`)
		}
	}

	async setOutputLocked(output: OutputState, lock: LockState): Promise<void> {
		if (lock !== 'U' && lock !== 'O') throw new Error('Invalid lock state')

		if (output.type === 'monitor') {
			this.#sendCommand('MONITORING OUTPUT LOCKS:\n' + output.id + ' ' + lock + '\n\n')
		} else {
			this.#sendCommand('VIDEO OUTPUT LOCKS:\n' + output.id + ' ' + lock + '\n\n')
		}
	}

	async setSerialLocked(serial: SerialState, lock: LockState): Promise<void> {
		if (lock !== 'U' && lock !== 'O') throw new Error('Invalid lock state')

		this.#sendCommand('SERIAL PORT LOCKS:\n' + serial.id + ' ' + lock + '\n\n')
	}
}
