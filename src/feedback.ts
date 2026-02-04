import { combineRgb, CompanionFeedbackDefinitions } from '@companion-module/base'
import { getInputChoices } from './choices.js'
import { VideohubState } from './state.js'
import type { InstanceBaseExt } from './types.js'

/**
 * Get the available feedbacks.
 */
export function getFeedbacks(self: InstanceBaseExt, state: VideohubState): CompanionFeedbackDefinitions {
	const { inputChoices, outputChoices, serialChoices } = getInputChoices(state)

	const feedbacks: CompanionFeedbackDefinitions = {}

	feedbacks['input_bg'] = {
		type: 'boolean',
		name: 'Video: Destination has specific source routed',
		defaultStyle: {
			color: combineRgb(0, 0, 0),
			bgcolor: combineRgb(255, 255, 0),
		},
		options: [
			{
				type: 'dropdown',
				label: 'Source',
				id: 'input',
				default: 0,
				choices: inputChoices,
			},
			{
				type: 'dropdown',
				label: 'Destination',
				id: 'output',
				default: 0,
				choices: outputChoices,
			},
		],
		callback: (feedback) => {
			return state.getOutputById(Number(feedback.options.output))?.route == Number(feedback.options.input)
		},
	}

	// feedbacks['input_bg_dyn'] = {
	// 	type: 'boolean',
	// 	name: 'Video: Destination has specific source routed (dynamic)',
	// 	defaultStyle: {
	// 		color: combineRgb(0, 0, 0),
	// 		bgcolor: combineRgb(255, 255, 0),
	// 	},
	// 	options: [
	// 		{
	// 			type: 'textinput',
	// 			label: 'Destination',
	// 			id: 'output',
	// 			default: '',
	// 			useVariables: { local: true },
	// 		},
	// 		{
	// 			type: 'textinput',
	// 			label: 'Source',
	// 			id: 'input',
	// 			default: '',
	// 			useVariables: { local: true },
	// 		},
	// 	],
	// 	callback: async function (feedback, context) {
	// 		let outputNum: string = await context.parseVariablesInString(String(feedback.options.output!))
	// 		let inputNum: string = await context.parseVariablesInString(String(feedback.options.input!))

	// 		let outputId = Number(outputNum) - 1
	// 		let inputId = Number(inputNum) - 1

	// 		return state.getOutputById(outputId)?.route == inputId
	// 	},
	// }

	if (serialChoices.length > 0) {
		feedbacks['serial_bg'] = {
			type: 'boolean',
			name: 'Serial: Destination has specific source routed',
			defaultStyle: {
				color: combineRgb(0, 0, 0),
				bgcolor: combineRgb(255, 255, 0),
			},
			options: [
				{
					type: 'dropdown',
					label: 'Source',
					id: 'input',
					default: 0,
					choices: serialChoices,
				},
				{
					type: 'dropdown',
					label: 'Destination',
					id: 'output',
					default: 0,
					choices: serialChoices,
				},
			],
			callback: (feedback) => {
				return state.getSerial(Number(feedback.options.output))?.route == Number(feedback.options.input)
			},
		}

		// feedbacks['serial_bg_dyn'] = {
		// 	type: 'boolean',
		// 	name: 'Serial: Destination has specific source routed (dynamic)',
		// 	defaultStyle: {
		// 		color: combineRgb(0, 0, 0),
		// 		bgcolor: combineRgb(255, 255, 0),
		// 	},
		// 	options: [
		// 		{
		// 			type: 'textinput',
		// 			label: 'Destination',
		// 			id: 'output',
		// 			default: '',
		// 			useVariables: { local: true },
		// 		},
		// 		{
		// 			type: 'textinput',
		// 			label: 'Source',
		// 			id: 'input',
		// 			default: '',
		// 			useVariables: { local: true },
		// 		},
		// 	],
		// 	callback: async function (feedback, context) {
		// 		let outputNum: string = await context.parseVariablesInString(String(feedback.options.output!))
		// 		let inputNum: string = await context.parseVariablesInString(String(feedback.options.input!))

		// 		let outputId = Number(outputNum) - 1
		// 		let inputId = Number(inputNum) - 1
		// 		return state.getSerial(outputId)?.route == inputId
		// 	},
		// }
	}

	feedbacks['selected_destination'] = {
		type: 'boolean',
		name: 'Video: specified destination is selected',
		defaultStyle: {
			color: combineRgb(0, 0, 0),
			bgcolor: combineRgb(255, 255, 0),
		},
		options: [
			{
				type: 'dropdown',
				label: 'Destination',
				id: 'output',
				default: 0,
				choices: outputChoices,
			},
		],
		callback: (feedback) => {
			self.log('debug', 'selected source : ' + state.selectedDestination)
			return Number(feedback.options.output) == state.selectedDestination
		},
	}

	// feedbacks['selected_destination_dyn'] = {
	// 	type: 'boolean',
	// 	name: 'Video: specified destination is selected (dynamic)',
	// 	defaultStyle: {
	// 		color: combineRgb(0, 0, 0),
	// 		bgcolor: combineRgb(255, 255, 0),
	// 	},
	// 	options: [
	// 		{
	// 			type: 'textinput',
	// 			label: 'Destination',
	// 			id: 'output',
	// 			default: '',
	// 			useVariables: { local: true },
	// 		},
	// 	],
	// 	callback: async function (feedback, context) {
	// 		let outputNum: string = await context.parseVariablesInString(String(feedback.options.output!))
	// 		let outputId = Number(outputNum) - 1
	// 		return outputId == state.selectedDestination
	// 	},
	// }

	feedbacks['selected_source'] = {
		type: 'boolean',
		name: 'Video: Specified source is routed to selected destination',
		defaultStyle: {
			color: combineRgb(0, 0, 0),
			bgcolor: combineRgb(255, 255, 255),
		},
		options: [
			{
				type: 'dropdown',
				label: 'Source',
				id: 'input',
				default: 0,
				choices: inputChoices,
			},
		],
		callback: (feedback) => {
			return state.getSelectedOutput()?.route == Number(feedback.options.input)
		},
	}

	// feedbacks['selected_source_dyn'] = {
	// 	type: 'boolean',
	// 	name: 'Video: Specified source is routed to selected destination (dynamic)',
	// 	defaultStyle: {
	// 		color: combineRgb(0, 0, 0),
	// 		bgcolor: combineRgb(255, 255, 255),
	// 	},
	// 	options: [
	// 		{
	// 			type: 'textinput',
	// 			label: 'Source',
	// 			id: 'input',
	// 			default: '',
	// 			useVariables: { local: true },
	// 		},
	// 	],
	// 	callback: async function (feedback, context) {
	// 		let inputNum: string = await context.parseVariablesInString(String(feedback.options.input!))
	// 		let inputId = Number(inputNum) - 1
	// 		return state.getSelectedOutput()?.route == inputId
	// 	},
	// }

	feedbacks['take'] = {
		type: 'boolean',
		name: 'Video: If there is a route queued',
		defaultStyle: {
			color: combineRgb(255, 255, 255),
			bgcolor: combineRgb(255, 0, 0),
		},
		options: [],
		callback: () => {
			return !!state.queuedOp
		},
	}

	feedbacks['take_tally_source'] = {
		type: 'boolean',
		name: 'Video: If the Specified source is queued for a take',
		defaultStyle: {
			color: combineRgb(255, 255, 255),
			bgcolor: combineRgb(255, 0, 0),
		},
		options: [
			{
				type: 'dropdown',
				label: 'Source',
				id: 'input',
				default: 0,
				choices: inputChoices,
			},
		],
		callback: (feedback) => {
			return (
				Number(feedback.options.input) == state.queuedOp?.src &&
				state.selectedDestination == state.queuedOp?.output.outputId
			)
		},
	}

	// feedbacks['take_tally_source_dyn'] = {
	// 	type: 'boolean',
	// 	name: 'Video: If the Specified source is queued for a take (dynamic)',
	// 	defaultStyle: {
	// 		color: combineRgb(255, 255, 255),
	// 		bgcolor: combineRgb(255, 0, 0),
	// 	},
	// 	options: [
	// 		{
	// 			type: 'textinput',
	// 			label: 'Source',
	// 			id: 'input',
	// 			default: '',
	// 			useVariables: { local: true },
	// 		},
	// 	],
	// 	callback: async function (feedback, context) {
	// 		let inputNum: string = await context.parseVariablesInString(String(feedback.options.input!))
	// 		let inputId = Number(inputNum) - 1

	// 		return inputId == state.queuedOp?.src && state.selectedDestination == state.queuedOp?.output.outputId
	// 	},
	// }

	feedbacks['take_tally_dest'] = {
		type: 'boolean',
		name: 'Video: If the specified destination is queued for a take',
		defaultStyle: {
			color: combineRgb(255, 255, 255),
			bgcolor: combineRgb(255, 0, 0),
		},
		options: [
			{
				type: 'dropdown',
				label: 'Destination',
				id: 'output',
				default: 0,
				choices: outputChoices,
			},
		],
		callback: (feedback) => {
			return Number(feedback.options.output) == state.queuedOp?.output.outputId
		},
	}

	// feedbacks['take_tally_dest_dyn'] = {
	// 	type: 'boolean',
	// 	name: 'Video: If the specified destination is queued for a take (dynamic)',
	// 	defaultStyle: {
	// 		color: combineRgb(255, 255, 255),
	// 		bgcolor: combineRgb(255, 0, 0),
	// 	},
	// 	options: [
	// 		{
	// 			type: 'textinput',
	// 			label: 'Destination',
	// 			id: 'output',
	// 			default: '',
	// 			useVariables: { local: true },
	// 		},
	// 	],
	// 	callback: async function (feedback, context) {
	// 		let outputNum: string = await context.parseVariablesInString(String(feedback.options.output!))
	// 		let outputId = Number(outputNum) - 1
	// 		return outputId == state.queuedOp?.output.outputId
	// 	},
	// }

	feedbacks['lock_output'] = {
		type: 'boolean',
		name: 'Lock: If destination is locked',
		defaultStyle: {
			color: combineRgb(255, 255, 255),
			bgcolor: combineRgb(255, 0, 0),
		},
		options: [
			{
				type: 'dropdown',
				label: 'Destination',
				id: 'output',
				default: 0,
				choices: outputChoices,
			},
		],
		callback: async function (feedback) {
			const output = state.getOutputById(Number(feedback.options.output))
			if (!output) return false

			return output.lock != 'U'
		},
	}

	// feedbacks['lock_output_dyn'] = {
	// 	type: 'boolean',
	// 	name: 'Lock: If destination is locked (dynamic)',
	// 	defaultStyle: {
	// 		color: combineRgb(255, 255, 255),
	// 		bgcolor: combineRgb(255, 0, 0),
	// 	},
	// 	options: [
	// 		{
	// 			type: 'textinput',
	// 			label: 'Destination',
	// 			id: 'output',
	// 			default: '',
	// 			useVariables: { local: true },
	// 		},
	// 	],
	// 	callback: async function (feedback, context) {
	// 		// Parse internal variables from options textinputs
	// 		const outputStr: string = await context.parseVariablesInString(String(feedback.options.output))

	// 		const output = state.getOutputById(Number(outputStr) - 1)
	// 		if (!output) return false

	// 		return output.lock != 'U'
	// 	},
	// }

	if (serialChoices.length > 0) {
		feedbacks['lock_serial'] = {
			type: 'boolean',
			name: 'Lock: If serial port is locked',
			defaultStyle: {
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(255, 0, 0),
			},
			options: [
				{
					type: 'dropdown',
					label: 'Port',
					id: 'serial',
					default: 0,
					choices: serialChoices,
				},
			],
			callback: async function (feedback) {
				const serial = state.getSerial(Number(feedback.options.serial))
				if (!serial) return false

				return serial.lock != 'U'
			},
		}

		// feedbacks['lock_serial_dyn'] = {
		// 	type: 'boolean',
		// 	name: 'Lock: If serial port is locked (dynamic)',
		// 	defaultStyle: {
		// 		color: combineRgb(255, 255, 255),
		// 		bgcolor: combineRgb(255, 0, 0),
		// 	},
		// 	options: [
		// 		{
		// 			type: 'textinput',
		// 			label: 'serial',
		// 			id: 'serial',
		// 			default: '',
		// 			useVariables: { local: true },
		// 		},
		// 	],
		// 	callback: async function (feedback, context) {
		// 		const serialStr: string = await context.parseVariablesInString(String(feedback.options.serial))

		// 		const serial = state.getSerial(Number(serialStr) - 1)
		// 		if (!serial) return false

		// 		return serial.lock != 'U'
		// 	},
		// }
	}

	return feedbacks
}
