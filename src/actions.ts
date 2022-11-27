import type { CompanionActionDefinitions } from '@companion-module/base'
import fs from 'fs/promises'
import { getInputChoices } from './choices'
import type { VideohubState } from './state'
import type { InstanceBaseExt } from './types'

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
			if (Number(action.options.destination) >= state.outputCount) {
				sendCommand(
					'MONITORING OUTPUT LABELS:\n' +
						(Number(action.options.destination) - state.outputCount) +
						' ' +
						action.options.label +
						'\n\n'
				)
			} else {
				sendCommand('OUTPUT LABELS:\n' + action.options.destination + ' ' + action.options.label + '\n\n')
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
			if (Number(action.options.destination) >= state.outputCount) {
				sendCommand(
					'VIDEO MONITORING OUTPUT ROUTING:\n' +
						(Number(action.options.destination) - state.outputCount) +
						' ' +
						action.options.source +
						'\n\n'
				)
			} else {
				sendCommand('VIDEO OUTPUT ROUTING:\n' + action.options.destination + ' ' + action.options.source + '\n\n')
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
			if (Number(action.options.destination) >= state.outputCount) {
				sendCommand(
					'VIDEO MONITORING OUTPUT ROUTING:\n' +
						(Number(action.options.destination) - state.outputCount) +
						' ' +
						action.options.source +
						'\n\n'
				)
			} else {
				const output = state.getOutput(Number(action.options.source_routed_to_destination))
				sendCommand('VIDEO OUTPUT ROUTING:\n' + action.options.destination + ' ' + output.route + '\n\n')
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
			let output = state.getOutput(Number(action.options.destination))

			let fallbackpop = output.fallback.pop() // The current route (i.e what the hardware is actually set to)
			// has already been pushed onto the stack at "updateRouting" so to
			// get to the last route we have to first pop this one off.
			fallbackpop = output.fallback.pop() // This now, is the route to fallback to.

			if (output.fallback.length < 1) {
				output.fallback.push(-1)
			}

			if (fallbackpop !== undefined && fallbackpop >= 0) {
				if (Number(action.options.destination) >= state.outputCount) {
					sendCommand(
						'VIDEO MONITORING OUTPUT ROUTING:\n' +
							(Number(action.options.destination) - state.outputCount) +
							' ' +
							fallbackpop +
							'\n\n'
					)
				} else {
					sendCommand('VIDEO OUTPUT ROUTING:\n' + action.options.destination + ' ' + fallbackpop + '\n\n')
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
			if (state.selectedDestination >= state.outputCount) {
				if (self.config.take) {
					state.queue =
						'VIDEO MONITORING OUTPUT ROUTING:\n' +
						(state.selectedDestination - state.outputCount) +
						' ' +
						action.options.source +
						'\n\n'
					state.queuedDest = state.selectedDestination - state.outputCount
					state.queuedSource = Number(action.options.source)

					self.checkFeedbacks('take', 'take_tally_source', 'take_tally_dest', 'take_tally_route')
				} else {
					sendCommand(
						'VIDEO MONITORING OUTPUT ROUTING:\n' +
							(state.selectedDestination - state.outputCount) +
							' ' +
							action.options.source +
							'\n\n'
					)
				}
			} else {
				if (self.config.take) {
					state.queue = 'VIDEO OUTPUT ROUTING:\n' + state.selectedDestination + ' ' + action.options.source + '\n\n'
					state.queuedDest = state.selectedDestination
					state.queuedSource = Number(action.options.source)

					self.checkFeedbacks('take', 'take_tally_source', 'take_tally_dest', 'take_tally_route')
				} else {
					sendCommand('VIDEO OUTPUT ROUTING:\n' + state.selectedDestination + ' ' + action.options.source + '\n\n')
				}
			}
		},
	}

	actions['take'] = {
		name: 'Take',
		options: [],
		callback: () => {
			const cmd = state.queue

			state.queue = ''
			state.queuedDest = -1
			state.queuedSource = -1

			self.checkFeedbacks('take', 'take_tally_source', 'take_tally_dest', 'take_tally_route')

			sendCommand(cmd)
		},
	}
	actions['clear'] = {
		name: 'Clear',
		options: [],
		callback: () => {
			state.queue = ''
			state.queuedDest = -1
			state.queuedSource = -1

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
					if (routes.length > 0 && routes.length <= state.outputCount) {
						cmd = ''
						for (let index = 0; index < routes.length; index++) {
							const dest_source = routes[index].split(' ').map((s) => Number(s))
							if (isNaN(dest_source[0])) {
								throw routes[index] + ' - ' + dest_source[0] + ' is not a valid Router Destination '
							}
							if (dest_source[0] < 0 || dest_source[0] > state.outputCount - 1) {
								throw (
									dest_source[0] +
									'  is an invalid destination.  Remember, Router is zero based when indexing ports.  Max Routes for this router = ' +
									state.outputCount
								)
							}
							if (isNaN(dest_source[1])) {
								throw routes[index] + ' - ' + dest_source[1] + ' is not a valid Router Source '
							}
							if (dest_source[1] < 0 || dest_source[1] > state.outputCount - 1) {
								throw (
									dest_source[1] +
									'  is an invalid source. Remember, Router is zero based when indexing ports.  Max Routes for this router = ' +
									state.outputCount
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
				"  : BMD uses zero based indexing when referencing source and destination so '0' in this file references port '1'.  You may add your own text here after the colon. \n"
			string = string + '\nRouting history: \n'

			const data = []
			for (let index = 0; index < state.outputCount; index++) {
				data[index] = index + ' ' + state.getOutput(index).route
				string = string + index + '  ' + state.getOutput(index).fallback + '\n'
			}

			try {
				await fs.writeFile(action.options.destination_file, data.join('') + string, 'utf8')
				self.log('info', data.length + ' Routes written to: ' + action.options.destination_file)
			} catch (e: any) {
				self.log('error', 'File Write Error: ' + e.message)
			}
		},
	}

	return actions
}
