import type { CompanionActionDefinitions, CompanionVariableValues } from '@companion-module/base'
import fs from 'fs/promises'
import { getInputChoices } from './choices.js'
import type { VideohubState } from './state.js'
import type { InstanceBaseExt } from './types.js'
import { updateSelectedDestinationVariables } from './variables.js'
import simpleEval from 'simple-eval'



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
				default: 0,
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
				default: 0,
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
					default: 0,
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
				default: 0,
				choices: inputChoices,
			},
			{
				type: 'dropdown',
				label: 'Destination',
				id: 'destination',
				default: 0,
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


	actions['route_dyn'] = {
		name: 'Route (dynamic)',
		options: [
			{
				type: 'textinput',
				label: 'Source',
				id: 'source',
				default: '',
				useVariables: {local: true}
			},
			{
				type: 'textinput',
				label: 'Destination',
				id: 'destination',
				default: '',
				useVariables: {local: true}
			},
		],
		callback: async function (action, context) {
			let destNum: string = await context.parseVariablesInString(String(action.options.destination))
			let sourceNum: string = await context.parseVariablesInString(String(action.options.source))
			
			let destId = Number(simpleEval(destNum))-1
			let sourceId = Number(simpleEval(sourceNum))-1
			const output = state.getOutputById(destId)
			if (output) {
				self.log('debug', String(output.index))
				if (output.type === 'monitor') {
					sendCommand('VIDEO MONITORING OUTPUT ROUTING:\n' + output.index + ' ' + sourceId + '\n\n')
				} else {
					sendCommand('VIDEO OUTPUT ROUTING:\n' + output.index + ' ' + sourceId + '\n\n')
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
				default: 0,
				choices: outputChoices,
			},
			{
				type: 'dropdown',
				label: 'Destination',
				id: 'destination',
				default: 0,
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


	actions['route_routed_dyn'] = {
		name: 'Route source routed to given destination (dynamic)',
		options: [
			{
				type: 'textinput',
				label: 'Destination to take routed source from',
				id: 'source_routed_to_destination',
				default: '',
				useVariables: {local: true}
			},
			{
				type: 'textinput',
				label: 'Destination',
				id: 'destination',
				default: '',
				useVariables: {local: true}
			},
		],
		callback: async function (action, context) {
			let destNum: string = await context.parseVariablesInString(String(action.options.destination))
			let sourceFromDestNum: string = await context.parseVariablesInString(String(action.options.source_routed_to_destination))
			const thisOutput = state.getOutputById(Number(simpleEval(destNum))-1)
			const otherOutput = state.getOutputById(Number(simpleEval(sourceFromDestNum))-1)

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
				default: 0,
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
					default: 0,
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

		actions['route_serial_dyn'] = {
			name: 'Route serial port (dynamic)',
			options: [
				{
					type: 'textinput',
					label: 'Source',
					id: 'source',
					default: '0',
					useVariables: {local: true}
				},
				{
					type: 'textinput',
					label: 'Destination',
					id: 'destination',
					default: '1',
					useVariables: {local: true}
				},
			],
			callback: async function (action, context) {
			let destNum: string = await context.parseVariablesInString(String(action.options.destination))
			let sourceNum: string = await context.parseVariablesInString(String(action.options.source))
			let destId = Number(simpleEval(destNum))-1
			let sourceId = Number(simpleEval(sourceNum))-1
		
				sendCommand('SERIAL PORT ROUTING:\n' + destId + ' ' + sourceId + '\n\n')
			},
		}
	}



	actions['route_to_previous_dyn'] = {
		name: 'Return to previous route (dynamic)',
		options: [
			{
				type: 'textinput',
				label: 'Destination',
				id: 'destination',
				default: '',
				useVariables: {local: true}
			},
		],
		callback: async function (action, context) {
			let destNum: string = await context.parseVariablesInString(String(action.options.destination))

			const output = state.getOutputById(Number(simpleEval(destNum))-1)

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
					default: 0,
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
				default: 0,
				choices: outputChoices,
			},
		],
		callback: (action) => {
			state.selectedDestination = Number(action.options.destination)
			if (state.queuedOp) {
				state.queuedOp.dest = state.selectedDestination;
			}

			self.checkFeedbacks('selected_destination', 'take_tally_dest', 'selected_source', 'take_tally_source', 'selected_destination_dyn', 'take_tally_dest_dyn', 'selected_source_dyn', 'take_tally_source_dyn')

			let values: CompanionVariableValues = {}
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
				default: 0,
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

						self.checkFeedbacks('take', 'take_tally_source', 'take_tally_dest', 'take_tally_route', 'take_tally_source_dyn', 'take_tally_dest_dyn', 'take_tally_route_dyn')
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

						self.checkFeedbacks('take', 'take_tally_source', 'take_tally_dest', 'take_tally_route', 'take_tally_source_dyn', 'take_tally_dest_dyn', 'take_tally_route_dyn')
					} else {
						sendCommand('VIDEO OUTPUT ROUTING:\n' + output.index + ' ' + action.options.source + '\n\n')
					}
				}
			}
			let values: CompanionVariableValues = {}
			updateSelectedDestinationVariables(state, values)
			self.setVariableValues(values)
		},
	}


	actions['select_destination_dyn'] = {
		name: 'Select destination (dynamic)',
		options: [
			{
				type: 'textinput',
				label: 'Destination',
				id: 'destination',
				default: '',
				useVariables: {local: true}
			},
		],
		callback: async function (action, context) {
			let destNum: string = await context.parseVariablesInString(String(action.options.destination))

			state.selectedDestination = Number(simpleEval(destNum))-1
			if (state.queuedOp) {
				state.queuedOp.dest = state.selectedDestination;
			}

			self.checkFeedbacks('selected_destination', 'take_tally_dest', 'take_tally_source', 'selected_source', 'selected_destination_dyn', 'take_tally_dest_dyn', 'selected_source_dyn', 'take_tally_source_dyn')

			let values: CompanionVariableValues = {}
			updateSelectedDestinationVariables(state, values)
			self.setVariableValues(values)
		},
	}



	actions['route_source_dyn'] = {
		name: 'Route source to selected destination (dynamic)',
		options: [
			{	type: 'textinput',
				label: 'Source',
				id: 'source',
				default: '',
				useVariables: {local: true}
			},
		],
		callback: async function (action, context) {
			let sourceNum: string = await context.parseVariablesInString(String(action.options.source))
			let sourceId = Number(simpleEval(sourceNum))-1
			const output = state.getSelectedOutput()
			if (output) {
				if (output.type === 'monitor') {
					if (self.config.take) {
						state.queuedOp = {
							cmd: 'VIDEO MONITORING OUTPUT ROUTING:\n' + output.index + ' ' + sourceId + '\n\n',
							dest: output.id,
							src: sourceId
						}

						self.checkFeedbacks('take', 'take_tally_source', 'take_tally_dest', 'take_tally_route', 'take_tally_source_dyn', 'take_tally_dest_dyn', 'take_tally_route_dyn')
					} else {
						sendCommand('VIDEO MONITORING OUTPUT ROUTING:\n' + output.index + ' ' + sourceId + '\n\n')
					}
				} else {
					if (self.config.take) {
						state.queuedOp = {
							cmd: 'VIDEO OUTPUT ROUTING:\n' + output.index + ' ' + sourceId + '\n\n',
							dest: output.id,
							src: sourceId,
						}

						self.checkFeedbacks('take', 'take_tally_source', 'take_tally_dest', 'take_tally_route', 'take_tally_source_dyn', 'take_tally_dest_dyn', 'take_tally_route_dyn')
					} else {
						sendCommand('VIDEO OUTPUT ROUTING:\n' + output.index + ' ' + sourceId + '\n\n')
					}
				}
			}
			let values: CompanionVariableValues = {}
			updateSelectedDestinationVariables(state, values)
			self.setVariableValues(values)
		},
		
	}



	actions['take'] = {
		name: 'Take',
		options: [],
		callback: () => {
			const op = state.queuedOp
			state.queuedOp = undefined
			
			let values: CompanionVariableValues = {}
			updateSelectedDestinationVariables(state, values)
			self.setVariableValues(values)

			self.checkFeedbacks('take', 'take_tally_source', 'take_tally_dest', 'take_tally_route', 'take_tally_source_dyn', 'take_tally_dest_dyn', 'take_tally_route_dyn')

			if (op) sendCommand(op.cmd)
		},
	}
	actions['clear'] = {
		name: 'Clear',
		options: [],
		callback: () => {self.log('debug', "559")
			state.queuedOp = undefined
self.log('debug', "561")
			let values: CompanionVariableValues = {}
			updateSelectedDestinationVariables(state, values)
			self.setVariableValues(values)
self.log('debug', "565")
			self.checkFeedbacks('take', 'take_tally_source', 'take_tally_dest', 'take_tally_route', 'take_tally_source_dyn', 'take_tally_dest_dyn', 'take_tally_route_dyn')
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
				useVariables: true,
			},
		],
		callback: async (action) => {
			if (!action.options.source_file || typeof action.options.source_file !== 'string') return

			const source_file = await self.parseVariablesInString(action.options.source_file)
			if (!source_file) return

			try {
				const data = await fs.readFile(source_file, 'utf8')
				try {
					const routes_text = data.split(':')[0] // trim off the comment and extra data
					const routes = routes_text.split(',') // split into the individual routes

					let primaryRoutes: string[] = []
					let monitorRoutes: string[] = []

					for (const route of routes) {
						const [dest, source] = route.split(' ').map((s) => Number(s))

						const output = state.getOutputById(dest)
						if (!output) {
							throw `${route} - ${dest} is not a valid Router Destination `
						}

						const input = state.getInput(source)
						if (!input) {
							throw `${route} - ${source} is not a valid Router Source `
						}

						if (output.type === 'monitor') {
							monitorRoutes.push(`${output.index} ${input.id}`)
						} else {
							primaryRoutes.push(`${output.index} ${input.id}`)
						}
					}

					if (primaryRoutes.length > 0) {
						sendCommand(`VIDEO OUTPUT ROUTING:\n${primaryRoutes.join('\n')}\n\n`)
					}
					if (monitorRoutes.length > 0) {
						sendCommand(`VIDEO MONITORING OUTPUT ROUTING:\n${primaryRoutes.join('\n')}\n\n`)
					}

					self.log('info', routes.length + ' Routes read from File: ' + source_file)
				} catch (err: any) {
					self.log('error', err + ' in File:' + source_file)
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
				useVariables: true,
			},
		],
		callback: async (action) => {
			if (!action.options.destination_file || typeof action.options.destination_file !== 'string') return

			const destination_file = await self.parseVariablesInString(action.options.destination_file)
			if (!destination_file) return

			let string =
				"  : BMD uses zero based indexing when referencing source and destination so '0' in this file references port '1'.  You may add your own text here after the colon. \n"
			string += '\nRouting history: \n'

			const data = []
			for (const output of state.iterateAllOutputs()) {
				data.push(`${output.id} ${output.route}`)
				string += `${output.id} ${output.fallback}\n`
			}

			try {
				await fs.writeFile(destination_file, data.join(',') + string, 'utf8')
				self.log('info', data.length + ' Routes written to: ' + destination_file)
			} catch (e: any) {
				self.log('error', 'File Write Error: ' + e.message)
			}
		},
	}

	return actions
}

