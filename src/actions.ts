import type { CompanionActionDefinitions, CompanionVariableValues } from '@companion-module/base'
import fs from 'fs/promises'
import { getInputChoices } from './choices.js'
import type { VideohubState } from './state.js'
import type { InstanceBaseExt } from './types.js'
import { updateSelectedDestinationVariables } from './variables.js'

/**
 * Get the available actions.
 *
 * !!! Utilized by bmd-multiview16 !!!
 */
export function getActions(self: InstanceBaseExt, state: VideohubState): CompanionActionDefinitions {
	const { inputChoices, outputChoices, serialChoices } = getInputChoices(state)

	const actions: CompanionActionDefinitions = {}

	const sendCommand = (cmd: string) => {
		if (self.socket !== undefined && self.socket.isConnected) {
			try {
				self.socket.send(cmd)
			} catch (error: any) {
				self.log('error', 'TCP error ' + error.message)
			}
		} else {
			self.log('error', 'Socket not connected ')
			self.init_tcp()
		}
	}

	actions['rename_destination'] = {
		name: 'Rename destination',
		options: [
			{
				type: 'dropdown',
				label: 'Destination',
				id: 'destination',
				default: '0',
				choices: outputChoices,
			},
			{
				type: 'textinput',
				label: 'New label',
				id: 'label',
				default: 'Dest name',
			},
		],
		callback: (action) => {
			const output = state.getOutputById(Number(action.options.destination))
			if (output) {
				if (output.type === 'monitor') {
					sendCommand('MONITORING OUTPUT LABELS:\n' + output.index + ' ' + action.options.label + '\n\n')
				} else {
					sendCommand('OUTPUT LABELS:\n' + output.index + ' ' + action.options.label + '\n\n')
				}
			}
		},
	}
	actions['rename_source'] = {
		name: 'Rename source',
		options: [
			{
				type: 'dropdown',
				label: 'Source',
				id: 'source',
				default: '0',
				choices: inputChoices,
			},
			{
				type: 'textinput',
				label: 'New label',
				id: 'label',
				default: 'Src name',
			},
		],
		callback: (action) => {
			sendCommand('INPUT LABELS:\n' + action.options.source + ' ' + action.options.label + '\n\n')
		},
	}

	if (serialChoices.length > 0) {
		actions['rename_serial'] = {
			name: 'Rename serial port',
			options: [
				{
					type: 'dropdown',
					label: 'Serial Port',
					id: 'serial',
					default: '0',
					choices: serialChoices,
				},
				{
					type: 'textinput',
					label: 'New label',
					id: 'label',
					default: 'Serial name',
				},
			],
			callback: (action) => {
				sendCommand('SERIAL PORT LABELS:\n' + action.options.serial + ' ' + action.options.label + '\n\n')
			},
		}
	}

	actions['route'] = {
		name: 'Route',
		options: [
			{
				type: 'dropdown',
				label: 'Source',
				id: 'source',
				default: '0',
				choices: inputChoices,
			},
			{
				type: 'dropdown',
				label: 'Destination',
				id: 'destination',
				default: '0',
				choices: outputChoices,
			},
		],
		callback: (action) => {
			const output = state.getOutputById(Number(action.options.destination))
			if (output) {
				if (output.type === 'monitor') {
					sendCommand('VIDEO MONITORING OUTPUT ROUTING:\n' + output.index + ' ' + action.options.source + '\n\n')
				} else {
					sendCommand('VIDEO OUTPUT ROUTING:\n' + output.index + ' ' + action.options.source + '\n\n')
				}
			}
		},
	}

	actions['route_routed'] = {
		name: 'Route source routed to given destination',
		options: [
			{
				type: 'dropdown',
				label: 'Destination to take routed source from',
				id: 'source_routed_to_destination',
				default: '0',
				choices: outputChoices,
			},
			{
				type: 'dropdown',
				label: 'Destination',
				id: 'destination',
				default: '0',
				choices: outputChoices,
			},
		],
		callback: (action) => {
			const thisOutput = state.getOutputById(Number(action.options.destination))
			const otherOutput = state.getOutputById(Number(action.options.source_routed_to_destination))

			if (thisOutput && otherOutput) {
				if (thisOutput.type === 'monitor') {
					sendCommand('VIDEO MONITORING OUTPUT ROUTING:\n' + thisOutput.index + ' ' + otherOutput.route + '\n\n')
				} else {
					sendCommand('VIDEO OUTPUT ROUTING:\n' + thisOutput.index + ' ' + otherOutput.route + '\n\n')
				}
			}
		},
	}

	actions['route_to_previous'] = {
		name: 'Return to previous route',
		options: [
			{
				type: 'dropdown',
				label: 'Destination',
				id: 'destination',
				default: '0',
				choices: outputChoices,
			},
		],
		callback: (action) => {
			const output = state.getOutputById(Number(action.options.destination))

			if (output) {
				let fallbackpop = output.fallback.pop() // The current route (i.e what the hardware is actually set to)
				// has already been pushed onto the stack at "updateRouting" so to
				// get to the last route we have to first pop this one off.
				fallbackpop = output.fallback.pop() // This now, is the route to fallback to.

				if (fallbackpop !== undefined && fallbackpop >= 0) {
					if (output.type === 'monitor') {
						sendCommand('VIDEO MONITORING OUTPUT ROUTING:\n' + output.index + ' ' + fallbackpop + '\n\n')
					} else {
						sendCommand('VIDEO OUTPUT ROUTING:\n' + output.index + ' ' + fallbackpop + '\n\n')
					}
				}
			}
		},
	}

	if (serialChoices.length > 0) {
		actions['route_serial'] = {
			name: 'Route serial port',
			options: [
				{
					type: 'dropdown',
					label: 'Source',
					id: 'source',
					default: '0',
					choices: serialChoices,
				},
				{
					type: 'dropdown',
					label: 'Destination',
					id: 'destination',
					default: '1',
					choices: serialChoices,
				},
			],
			callback: (action) => {
				sendCommand('SERIAL PORT ROUTING:\n' + action.options.destination + ' ' + action.options.source + '\n\n')
			},
		}
	}

	actions['select_destination'] = {
		name: 'Select destination',
		options: [
			{
				type: 'dropdown',
				label: 'Destination',
				id: 'destination',
				default: '0',
				choices: outputChoices,
			},
		],
		callback: (action) => {
			state.selectedDestination = Number(action.options.destination)

			self.checkFeedbacks('selected_destination', 'take_tally_source', 'selected_source')

			const values: CompanionVariableValues = {}
			updateSelectedDestinationVariables(state, values)
			self.setVariableValues(values)
		},
	}
	actions['route_source'] = {
		name: 'Route source to selected destination',
		options: [
			{
				type: 'dropdown',
				label: 'Source',
				id: 'source',
				default: '0',
				choices: inputChoices,
			},
		],
		callback: (action) => {
			const output = state.getSelectedOutput()
			if (output) {
				if (output.type === 'monitor') {
					if (self.config.take) {
						state.queuedOp = {
							cmd: 'VIDEO MONITORING OUTPUT ROUTING:\n' + output.index + ' ' + action.options.source + '\n\n',
							dest: output.id,
							src: Number(action.options.source),
						}

						self.checkFeedbacks('take', 'take_tally_source', 'take_tally_dest', 'take_tally_route')
					} else {
						sendCommand('VIDEO MONITORING OUTPUT ROUTING:\n' + output.index + ' ' + action.options.source + '\n\n')
					}
				} else {
					if (self.config.take) {
						state.queuedOp = {
							cmd: 'VIDEO OUTPUT ROUTING:\n' + output.index + ' ' + action.options.source + '\n\n',
							dest: output.id,
							src: Number(action.options.source),
						}

						self.checkFeedbacks('take', 'take_tally_source', 'take_tally_dest', 'take_tally_route')
					} else {
						sendCommand('VIDEO OUTPUT ROUTING:\n' + output.index + ' ' + action.options.source + '\n\n')
					}
				}
			}
		},
	}

	actions['take'] = {
		name: 'Take',
		options: [],
		callback: () => {
			const op = state.queuedOp
			state.queuedOp = undefined

			self.checkFeedbacks('take', 'take_tally_source', 'take_tally_dest', 'take_tally_route')

			if (op) sendCommand(op.cmd)
		},
	}
	actions['clear'] = {
		name: 'Clear',
		options: [],
		callback: () => {
			state.queuedOp = undefined

			self.checkFeedbacks('take', 'take_tally_source', 'take_tally_dest', 'take_tally_route')
		},
	}

	actions['load_route_from_file'] = {
		name: 'Load Routes File',
		options: [
			{
				type: 'textinput',
				label: 'Source File',
				id: 'source_file',
				default: 'C:\\VideoHub.txt',
			},
		],
		callback: async (action) => {
			if (!action.options.source_file || typeof action.options.source_file !== 'string') return

			try {
				const data = await fs.readFile(action.options.source_file, 'utf8')
				try {
					let cmd = ''

					const routes_text = data.split(':')
					const routes = routes_text[0].split(',')
					if (routes.length > 0 && routes.length <= state.allOutputsCount) {
						cmd = ''
						for (let index = 0; index < routes.length; index++) {
							const dest_source = routes[index].split(' ').map((s) => Number(s))
							if (isNaN(dest_source[0])) {
								throw routes[index] + ' - ' + dest_source[0] + ' is not a valid Router Destination '
							}
							if (dest_source[0] < 0 || dest_source[0] > state.allOutputsCount - 1) {
								throw (
									dest_source[0] +
									'  is an invalid destination.  Remember, Router is zero based when indexing ports.  Max Routes for this router = ' +
									state.allOutputsCount
								)
							}
							if (isNaN(dest_source[1])) {
								throw routes[index] + ' - ' + dest_source[1] + ' is not a valid Router Source '
							}
							if (dest_source[1] < 0 || dest_source[1] > state.allOutputsCount - 1) {
								throw (
									dest_source[1] +
									'  is an invalid source. Remember, Router is zero based when indexing ports.  Max Routes for this router = ' +
									state.allOutputsCount
								)
							}
							cmd = cmd + 'VIDEO OUTPUT ROUTING:\n' + routes[index] + '\n\n'
						}
					} else {
						throw 'Invalid number of Routes: ' + routes.length + ','
					}

					sendCommand(cmd)

					self.log('info', routes.length + ' Routes read from File: ' + action.options.source_file)
				} catch (err: any) {
					self.log('error', err + ' in File:' + action.options.source_file)
				}
			} catch (e: any) {
				self.log('error', 'File Read Error: ' + e.message)
			}
		},
	}

	actions['store_route_in_file'] = {
		name: 'Save Routes File',
		options: [
			{
				type: 'textinput',
				label: 'Destination File',
				id: 'destination_file',
				default: 'C:\\VideoHub.txt',
			},
		],
		callback: async (action) => {
			if (!action.options.destination_file || typeof action.options.destination_file !== 'string') return

			let string =
				"\n\n  : BMD uses zero based indexing when referencing source and destination so '0' in this file references port '1'.  You may add your own text here after the colon. \n"
			string += '\nRouting history: \n'

			const data = []
			for (const output of state.iterateAllOutputs()) {
				data.push(`${output.id} ${output.route}`)
				string += `${output.id} ${output.fallback}\n`
			}

			try {
				await fs.writeFile(action.options.destination_file, data.join('\n') + string, 'utf8')
				self.log('info', data.length + ' Routes written to: ' + action.options.destination_file)
			} catch (e: any) {
				self.log('error', 'File Write Error: ' + e.message)
			}
		},
	}

	return actions
}
