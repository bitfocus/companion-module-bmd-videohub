import type { CompanionVariableValues } from '@companion-module/base'
import type { VideohubState } from './state.js'
import type { InstanceBaseExt } from './types.js'
import { updateSelectedDestinationVariables } from './variables.js'

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
				const output = state.getOutputById(num)
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
				variableValues[`output_${output.id + 1}_input`] = state.getInput(output.route)?.name ?? '?'
			}
		}
	}

	updateSelectedDestinationVariables(state, variableValues)

	self.setVariableValues(variableValues)
}

// /**
//  * INTERNAL: Updates lock states based on data from the Videohub
//  *
//  * @param {string} labeltype - the command/data type being passed
//  * @param {Object} object - the collected data
//  * @access protected
//  * @since 1.1.0
//  */
// export function updateLocks(self: InstanceBaseExt, labeltype: string, object) {
// 	for (var key in object) {
// 		var parsethis = object[key]
// 		var a = parsethis.split(/ /)
// 		var num = parseInt(a.shift())
// 		var label = a.join(' ')

// 		switch (labeltype) {
// 			case 'MONITORING OUTPUT LOCKS':
// 				num = num + this.outputCount
// 			case 'VIDEO OUTPUT LOCKS':
// 				this.getOutput(num).lock = label
// 				break
// 			case 'SERIAL PORT LOCKS':
// 				this.getSerial(num).lock = label
// 				break
// 		}
// 	}
// }

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
				}
				break
			}
			case 'VIDEO OUTPUT ROUTING': {
				const output = state.getOutputById(dest)
				if (output) {
					// Lets not let the fallback array grow without bounds. is 20 enough?
					if (output.fallback.length > 20) {
						output.fallback = output.fallback.slice(2)
					}
					output.fallback.push(src) // push the route returned from the hardware into the fallback route
					output.route = src // now we set the route in the container to the new value

					variableValues[`output_${dest + 1}_input`] = state.getInput(src)?.name ?? '?'
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
	self.checkFeedbacks('input_bg', 'selected_source')
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
