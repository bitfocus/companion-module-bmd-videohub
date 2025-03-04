import type { CompanionActionDefinitions, CompanionVariableValues } from '@companion-module/base'
import fs from 'fs/promises'
import { getInputChoices } from './choices.js'
import { LockState, OutputState, type VideohubState } from './state.js'
import type { InstanceBaseExt } from './types.js'
import { updateSelectedDestinationVariables } from './variables.js'
import { parseUserLockStateString } from './util.js'
import type { VideohubApi } from './internalAPI.js'

/**
 * Get the available actions.
 */
export function getActions(self: InstanceBaseExt, api: VideohubApi, state: VideohubState): CompanionActionDefinitions {
	const { inputChoices, outputChoices, serialChoices, lockChoices } = getInputChoices(state)

	const actions: CompanionActionDefinitions = {}

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
				useVariables: { local: true },
			},
		],
		callback: async (action, context) => {
			let name: string = await context.parseVariablesInString(String(action.options.label))
			const output = state.getOutputById(Number(action.options.destination))
			if (!output) return

			await api.setOutputLabel(output, name)
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
				useVariables: { local: true },
			},
		],
		callback: async (action, context) => {
			let name: string = await context.parseVariablesInString(String(action.options.label))

			const input = state.getInput(Number(action.options.source))
			if (!input) return

			await api.setInputLabel(input, name)
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
					useVariables: { local: true },
				},
			],
			callback: async (action, context) => {
				let name: string = await context.parseVariablesInString(String(action.options.label))

				const serial = state.getSerial(Number(action.options.serial))
				if (!serial) return

				await api.setSerialLabel(serial, name)
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
			{
				type: 'checkbox',
				label: 'Ignore Lock',
				id: 'ignore_lock',
				default: false,
			},
		],
		callback: async (action) => {
			const output = state.getOutputById(Number(action.options.destination))
			if (!output) return

			await api.setOutputRoute(output, Number(action.options.source), !!action.options.ignore_lock)
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
				useVariables: { local: true },
			},
			{
				type: 'textinput',
				label: 'Destination',
				id: 'destination',
				default: '',
				useVariables: { local: true },
			},
			{
				type: 'checkbox',
				label: 'Ignore Lock',
				id: 'ignore_lock',
				default: false,
			},
		],
		callback: async (action, context) => {
			let destNum: string = await context.parseVariablesInString(String(action.options.destination))
			let sourceNum: string = await context.parseVariablesInString(String(action.options.source))

			const output = state.getOutputById(Number(destNum) - 1)
			if (!output) return

			await api.setOutputRoute(output, Number(sourceNum) - 1, !!action.options.ignore_lock)
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
			{
				type: 'checkbox',
				label: 'Ignore Lock',
				id: 'ignore_lock',
				default: false,
			},
		],
		callback: async (action) => {
			const thisOutput = state.getOutputById(Number(action.options.destination))
			const otherOutput = state.getOutputById(Number(action.options.source_routed_to_destination))

			if (!thisOutput || !otherOutput) return

			await api.setOutputRoute(thisOutput, otherOutput.route, !!action.options.ignore_lock)
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
				useVariables: { local: true },
			},
			{
				type: 'textinput',
				label: 'Destination',
				id: 'destination',
				default: '',
				useVariables: { local: true },
			},
			{
				type: 'checkbox',
				label: 'Ignore Lock',
				id: 'ignore_lock',
				default: false,
			},
		],
		callback: async (action, context) => {
			let destNum: string = await context.parseVariablesInString(String(action.options.destination))
			let sourceFromDestNum: string = await context.parseVariablesInString(
				String(action.options.source_routed_to_destination)
			)
			const thisOutput = state.getOutputById(Number(destNum) - 1)
			const otherOutput = state.getOutputById(Number(sourceFromDestNum) - 1)

			if (!thisOutput || !otherOutput) return

			await api.setOutputRoute(thisOutput, otherOutput.route, !!action.options.ignore_lock)
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
			{
				type: 'checkbox',
				label: 'Ignore Lock',
				id: 'ignore_lock',
				default: false,
			},
		],
		callback: async (action) => {
			const output = state.getOutputById(Number(action.options.destination))

			if (!output) return

			let fallbackpop = output.fallback.pop() // The current route (i.e what the hardware is actually set to)
			// has already been pushed onto the stack at "updateRouting" so to
			// get to the last route we have to first pop this one off.
			fallbackpop = output.fallback.pop() // This now, is the route to fallback to.

			if (fallbackpop !== undefined && fallbackpop >= 0) {
				await api.setOutputRoute(output, fallbackpop, !!action.options.ignore_lock)
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
				{
					type: 'checkbox',
					label: 'Ignore Lock',
					id: 'ignore_lock',
					default: false,
				},
			],
			callback: async (action) => {
				const serial = state.getSerial(Number(action.options.destination))
				if (!serial) return

				await api.setSerialRoute(serial, Number(action.options.source), !!action.options.ignore_lock)
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
					useVariables: { local: true },
				},
				{
					type: 'textinput',
					label: 'Destination',
					id: 'destination',
					default: '1',
					useVariables: { local: true },
				},
				{
					type: 'checkbox',
					label: 'Ignore Lock',
					id: 'ignore_lock',
					default: false,
				},
			],
			callback: async (action, context) => {
				let destNum: string = await context.parseVariablesInString(String(action.options.destination))
				let sourceNum: string = await context.parseVariablesInString(String(action.options.source))

				const serial = state.getSerial(Number(destNum) - 1)
				if (!serial) return

				await api.setSerialRoute(serial, Number(sourceNum) - 1, !!action.options.ignore_lock)
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
				useVariables: { local: true },
			},
			{
				type: 'checkbox',
				label: 'Ignore Lock',
				id: 'ignore_lock',
				default: false,
			},
		],
		callback: async (action, context) => {
			let destNum: string = await context.parseVariablesInString(String(action.options.destination))

			const output = state.getOutputById(Number(destNum) - 1)
			if (!output) return

			let fallbackpop = output.fallback.pop() // The current route (i.e what the hardware is actually set to)
			// has already been pushed onto the stack at "updateRouting" so to
			// get to the last route we have to first pop this one off.
			fallbackpop = output.fallback.pop() // This now, is the route to fallback to.

			if (fallbackpop !== undefined && fallbackpop >= 0) {
				await api.setOutputRoute(output, fallbackpop, !!action.options.ignore_lock)
			}
		},
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
			const output = state.getOutputById(Number(action.options.destination))
			if (!output) return

			state.selectedDestination = output.outputId
			if (state.queuedOp) {
				state.queuedOp.output = output
			}

			self.checkFeedbacks(
				'selected_destination',
				'take_tally_dest',
				'selected_source',
				'take_tally_source',
				'selected_destination_dyn',
				'take_tally_dest_dyn',
				'selected_source_dyn',
				'take_tally_source_dyn'
			)

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
			{
				type: 'checkbox',
				label: 'Ignore Lock',
				id: 'ignore_lock',
				default: false,
			},
		],
		callback: async (action) => {
			const output = state.getSelectedOutput()
			if (!output) return

			if (self.config.take) {
				state.queuedOp = {
					output: output,
					src: Number(action.options.source),
				}

				self.checkFeedbacks(
					'take',
					'take_tally_source',
					'take_tally_dest',
					'take_tally_route',
					'take_tally_source_dyn',
					'take_tally_dest_dyn',
					'take_tally_route_dyn'
				)
			} else {
				await api.setOutputRoute(output, Number(action.options.source), !!action.options.ignore_lock)
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
				useVariables: { local: true },
			},
		],
		callback: async (action, context) => {
			let destNum: string = await context.parseVariablesInString(String(action.options.destination))

			const output = state.getOutputById(Number(destNum) - 1)
			if (!output) return

			state.selectedDestination = output.outputId
			if (state.queuedOp) {
				state.queuedOp.output = output
			}

			self.checkFeedbacks(
				'selected_destination',
				'take_tally_dest',
				'take_tally_source',
				'selected_source',
				'selected_destination_dyn',
				'take_tally_dest_dyn',
				'selected_source_dyn',
				'take_tally_source_dyn'
			)

			let values: CompanionVariableValues = {}
			updateSelectedDestinationVariables(state, values)
			self.setVariableValues(values)
		},
	}

	actions['route_source_dyn'] = {
		name: 'Route source to selected destination (dynamic)',
		options: [
			{
				type: 'textinput',
				label: 'Source',
				id: 'source',
				default: '',
				useVariables: { local: true },
			},
			{
				type: 'checkbox',
				label: 'Ignore Lock',
				id: 'ignore_lock',
				default: false,
			},
		],
		callback: async (action, context) => {
			let sourceNum: string = await context.parseVariablesInString(String(action.options.source))
			let sourceId = Number(sourceNum) - 1

			const output = state.getSelectedOutput()
			if (!output) return

			if (self.config.take) {
				state.queuedOp = {
					output: output,
					src: sourceId,
				}

				self.checkFeedbacks(
					'take',
					'take_tally_source',
					'take_tally_dest',
					'take_tally_route',
					'take_tally_source_dyn',
					'take_tally_dest_dyn',
					'take_tally_route_dyn'
				)
			} else {
				await api.setOutputRoute(output, sourceId, !!action.options.ignore_lock)
			}

			let values: CompanionVariableValues = {}
			updateSelectedDestinationVariables(state, values)
			self.setVariableValues(values)
		},
	}

	actions['take'] = {
		name: 'Take',
		options: [
			{
				type: 'checkbox',
				label: 'Ignore Lock',
				id: 'ignore_lock',
				default: false,
			},
		],
		callback: async (action) => {
			const op = state.queuedOp
			state.queuedOp = undefined

			let values: CompanionVariableValues = {}
			updateSelectedDestinationVariables(state, values)
			self.setVariableValues(values)

			self.checkFeedbacks(
				'take',
				'take_tally_source',
				'take_tally_dest',
				'take_tally_route',
				'take_tally_source_dyn',
				'take_tally_dest_dyn',
				'take_tally_route_dyn'
			)

			if (!op || op.src === undefined) return

			await api.setOutputRoute(op.output, op.src, !!action.options.ignore_lock)
		},
	}
	actions['clear'] = {
		name: 'Clear',
		options: [],
		callback: () => {
			state.queuedOp = undefined
			let values: CompanionVariableValues = {}
			updateSelectedDestinationVariables(state, values)
			self.setVariableValues(values)
			self.checkFeedbacks(
				'take',
				'take_tally_source',
				'take_tally_dest',
				'take_tally_route',
				'take_tally_source_dyn',
				'take_tally_dest_dyn',
				'take_tally_route_dyn'
			)
		},
	}

	actions['load_route_from_file'] = {
		name: 'Load Routes File',
		description: 'This will ignore any locked outputs',
		options: [
			{
				type: 'textinput',
				label: 'Source File',
				id: 'source_file',
				default: 'C:\\VideoHub.txt',
				useVariables: true,
			},
		],
		callback: async (action, context) => {
			if (!action.options.source_file || typeof action.options.source_file !== 'string') return

			const source_file = await context.parseVariablesInString(action.options.source_file)
			if (!source_file) return

			try {
				const data = await fs.readFile(source_file, 'utf8')
				try {
					const routes_text = data.split(':')[0] // trim off the comment and extra data
					const routes = routes_text.split(',') // split into the individual routes

					const mappedRoutes = new Map<OutputState, number>()

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

						mappedRoutes.set(output, input.id)
					}

					await api.setMultipleOutputRoutes(mappedRoutes)

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
		callback: async (action, context) => {
			if (!action.options.destination_file || typeof action.options.destination_file !== 'string') return

			const destination_file = await context.parseVariablesInString(action.options.destination_file)
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

	actions['lock_output'] = {
		name: 'Lock/Unlock Output',
		options: [
			{
				type: 'dropdown',
				label: 'Output',
				id: 'output',
				default: 0,
				choices: outputChoices,
			},
			{
				type: 'dropdown',
				label: 'Lock State',
				id: 'lock_state',
				default: 'U',
				choices: lockChoices,
			},
			{
				type: 'checkbox',
				label: 'Force',
				id: 'ignore_lock',
				default: false,
			},
		],
		callback: async (action) => {
			const output = state.getOutputById(Number(action.options.output))
			if (!output) return

			if (action.options.ignore_lock) await api.setOutputLocked(output, 'F')

			await api.setOutputLocked(output, action.options.lock_state as LockState)
		},
	}

	actions['lock_output_dyn'] = {
		name: 'Lock/Unlock Output (dynamic)',
		options: [
			{
				type: 'textinput',
				label: 'Output',
				id: 'output',
				default: '',
				useVariables: { local: true },
			},
			{
				type: 'textinput',
				label: 'Lock State',
				id: 'lock_state',
				default: 'lock',
				useVariables: { local: true },
				tooltip: 'lock/unlock',
			},
			{
				type: 'checkbox',
				label: 'Force',
				id: 'ignore_lock',
				default: false,
			},
		],
		callback: async (action, context) => {
			// Parse internal variables from options textinputs
			let outputStr: string = await context.parseVariablesInString(String(action.options.output))
			let lockStr: string = await context.parseVariablesInString(String(action.options.lock_state))

			// Evaluate outpu expression
			let outputId = Number(outputStr) - 1

			const lockState = parseUserLockStateString(lockStr)
			self.log('info', 'lockState: ' + lockState + ' from ' + lockStr)
			if (!lockState) {
				self.log('error', "Can't evaluate lock state")
				return
			}

			const output = state.getOutputById(outputId)
			if (!output) return

			if (action.options.ignore_lock) await api.setOutputLocked(output, 'F')

			await api.setOutputLocked(output, lockState)
		},
	}

	actions['lock_serial'] = {
		name: 'Lock/Unlock Serial',
		options: [
			{
				type: 'dropdown',
				label: 'Serial',
				id: 'serial',
				default: 0,
				choices: serialChoices,
			},
			{
				type: 'dropdown',
				label: 'Lock State',
				id: 'lock_state',
				default: 'U',
				choices: lockChoices,
			},
			{
				type: 'checkbox',
				label: 'Force',
				id: 'ignore_lock',
				default: false,
			},
		],
		callback: async (action) => {
			const serial = state.getSerial(Number(action.options.serial))
			if (!serial) return

			if (action.options.ignore_lock) await api.setSerialLocked(serial, 'F')

			await api.setSerialLocked(serial, action.options.lock_state as LockState)
		},
	}

	actions['lock_serial_dyn'] = {
		name: 'Lock/Unlock Serial (dynamic)',
		options: [
			{
				type: 'textinput',
				label: 'serial',
				id: 'serial',
				default: '',
				useVariables: { local: true },
			},
			{
				type: 'textinput',
				label: 'Lock State',
				id: 'lock_state',
				default: 'lock',
				useVariables: { local: true },
				tooltip: 'lock/unlock',
			},
			{
				type: 'checkbox',
				label: 'Force',
				id: 'ignore_lock',
				default: false,
			},
		],
		callback: async (action, context) => {
			let serialStr: string = await context.parseVariablesInString(String(action.options.serial))
			let lockStr: string = await context.parseVariablesInString(String(action.options.lock_state))

			let serialId = Number(serialStr) - 1

			const lockState = parseUserLockStateString(lockStr)
			if (!lockState) {
				self.log('error', "Can't evaluate lock state")
				return
			}

			const serial = state.getSerial(serialId)
			if (!serial) return

			if (action.options.ignore_lock) await api.setSerialLocked(serial, 'F')

			await api.setSerialLocked(serial, lockState)
		},
	}

	return actions
}
