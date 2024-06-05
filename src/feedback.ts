import { combineRgb, CompanionFeedbackDefinitions } from '@companion-module/base'
import { getInputChoices } from './choices.js'
import { VideohubState } from './state.js'
import type { InstanceBaseExt } from './types.js'
import simpleEval from 'simple-eval'

/**
 * Get the available feedbacks.
 *
 * !!! Utilized by bmd-multiview16 !!!
 */
export function getFeedbacks(state: VideohubState, self: InstanceBaseExt): CompanionFeedbackDefinitions {
	const { inputChoices, outputChoices, serialChoices } = getInputChoices(state)

	const feedbacks: CompanionFeedbackDefinitions = {}

	feedbacks['input_bg'] = {
		type: 'boolean',
		name: 'Change background color by destination',
		description: 'If the input specified is in use by the output specified, change background color of the bank',
		defaultStyle: {
			color: combineRgb(0, 0, 0),
			bgcolor: combineRgb(255, 255, 0),
		},
		options: [
			{
				type: 'dropdown',
				label: 'Input',
				id: 'input',
				default: 0,
				choices: inputChoices,
			},
			{
				type: 'dropdown',
				label: 'Output',
				id: 'output',
				default: 0,
				choices: outputChoices,
			},
		],
		callback: (feedback) => {
			return state.getOutputById(Number(feedback.options.output))?.route == Number(feedback.options.input)
		},
	}


	feedbacks['input_bg_dyn'] = {
		type: 'boolean',
		name: 'Change background color by destination (dynamic)',
		description: 'If the input specified is in use by the output specified, change background color of the bank',
		defaultStyle: {
			color: combineRgb(0, 0, 0),
			bgcolor: combineRgb(255, 255, 0),
		},
		options: [
			{
				type: 'textinput',
				label: 'Output',
				id: 'output',
				default: '',
				useVariables: {local: true}
			},
			{
				type: 'textinput',
				label: 'Input',
				id: 'input',
				default: '',
				useVariables: {local: true}
			},
		],
		callback: async function (feedback, context) {
			let outputNum: string = await context.parseVariablesInString(String(feedback.options.output!))
			let inputNum: string = await context.parseVariablesInString(String(feedback.options.input!))

			let outputId = Number(simpleEval(outputNum))-1
			let inputId = Number(simpleEval(inputNum))-1

			return state.getOutputById(outputId)?.route == inputId
		},
	}


	if (serialChoices.length > 0) {
		feedbacks['serial_bg'] = {
			type: 'boolean',
			name: 'Change background color by serial route',
			description: 'If the input specified is in use by the output specified, change background color of the bank',
			defaultStyle: {
				color: combineRgb(0, 0, 0),
				bgcolor: combineRgb(255, 255, 0),
			},
			options: [
				{
					type: 'dropdown',
					label: 'Input',
					id: 'input',
					default: 0,
					choices: serialChoices,
				},
				{
					type: 'dropdown',
					label: 'Output',
					id: 'output',
					default: 0,
					choices: serialChoices,
				},
			],
			callback: (feedback) => {
				return state.getSerial(Number(feedback.options.output))?.route == Number(feedback.options.input)
			},
		}

		feedbacks['serial_bg_dyn'] = {
			type: 'boolean',
			name: 'Change background color by serial route (dynamic)',
			description: 'If the input specified is in use by the output specified, change background color of the bank',
			defaultStyle: {
				color: combineRgb(0, 0, 0),
				bgcolor: combineRgb(255, 255, 0),
			},
			options: [
				{
					type: 'textinput',
					label: 'Output',
					id: 'output',
					default: '',
					useVariables: {local: true}
				},
				{
					type: 'textinput',
					label: 'Input',
					id: 'input',
					default: '',
					useVariables: {local: true}
				},
			],
			callback: async function (feedback, context) {
				let outputNum: string = await context.parseVariablesInString(String(feedback.options.output!))
				let inputNum: string = await context.parseVariablesInString(String(feedback.options.input!))

				let outputId = Number(simpleEval(outputNum))-1
				let inputId = Number(simpleEval(inputNum))-1
				return state.getSerial(outputId)?.route == inputId
			},
		}
	}

	feedbacks['selected_destination'] = {
		type: 'boolean',
		name: 'Change background color by selected destination',
		description: 'If the output specified is selected, change background color of the bank',
		defaultStyle: {
			color: combineRgb(0, 0, 0),
			bgcolor: combineRgb(255, 255, 0),
		},
		options: [
			{
				type: 'dropdown',
				label: 'Output',
				id: 'output',
				default: 0,
				choices: outputChoices,
			},
		],
		callback: (feedback) => {
			self.log('debug', 'selected source : '+ state.selectedDestination)
			return Number(feedback.options.output) == state.selectedDestination
		},
	}

	feedbacks['selected_destination_dyn'] = {
		type: 'boolean',
		name: 'Change background color by selected destination (dynamic)',
		description: 'If the output specified is selected, change background color of the bank',
		defaultStyle: {
			color: combineRgb(0, 0, 0),
			bgcolor: combineRgb(255, 255, 0),
		},
		options: [
			{
				type: 'textinput',
				label: 'Output',
				id: 'output',
				default: '',
				useVariables: {local: true}
			},
		],
		callback: async function (feedback, context) {
			let outputNum: string = await context.parseVariablesInString(String(feedback.options.output!))
			let outputId = Number(simpleEval(outputNum))-1
			return (outputId == state.selectedDestination)
		},
	}



	feedbacks['selected_source'] = {
		type: 'boolean',
		name: 'Change background color by route to selected destination',
		description: 'If the input specified is in use by the selected output, change background color of the bank',
		defaultStyle: {
			color: combineRgb(0, 0, 0),
			bgcolor: combineRgb(255, 255, 255),
		},
		options: [
			{
				type: 'dropdown',
				label: 'Input',
				id: 'input',
				default: 0,
				choices: inputChoices,
			},
		],
		callback: (feedback) => {
			return state.getSelectedOutput()?.route == Number(feedback.options.input)
		},
	}

	feedbacks['selected_source_dyn'] = {
		type: 'boolean',
		name: 'Change background color by route to selected destination (dynamic)',
		description: 'If the input specified is in use by the selected output, change background color of the bank',
		defaultStyle: {
			color: combineRgb(0, 0, 0),
			bgcolor: combineRgb(255, 255, 255),
		},
		options: [
			{
				type: 'textinput',
				label: 'Input',
				id: 'input',
				default: '',
				useVariables: {local: true}
			},
		],
		callback: async function (feedback, context) {
			let inputNum: string = await context.parseVariablesInString(String(feedback.options.input!))
			let inputId = Number(simpleEval(inputNum))-1
			return state.getSelectedOutput()?.route == inputId
		},
	}

	feedbacks['take'] = {
		type: 'boolean',
		name: 'Change background color if take has a route queued',
		description: 'If a route is queued for take, change background color of the bank',
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
		name: 'Change background color if the selected source is queued in take',
		description: 'If the selected source is queued for take, change background color of the bank',
		defaultStyle: {
			color: combineRgb(255, 255, 255),
			bgcolor: combineRgb(255, 0, 0),
		},
		options: [
			{
				type: 'dropdown',
				label: 'Input',
				id: 'input',
				default: 0,
				choices: inputChoices,
			},
		],
		callback: (feedback) => {
			return Number(feedback.options.input) == state.queuedOp?.src && state.selectedDestination == state.queuedOp?.dest
		},
	}

	feedbacks['take_tally_source_dyn'] = {
		type: 'boolean',
		name: 'Change background color if the selected source is queued in take (dynamic)',
		description: 'If the selected source is queued for take, change background color of the bank',
		defaultStyle: {
			color: combineRgb(255, 255, 255),
			bgcolor: combineRgb(255, 0, 0),
		},
		options: [
			{
				type: 'textinput',
				label: 'Input',
				id: 'input',
				default: '',
				useVariables: {local: true}
			},
		],
		callback: async function (feedback, context) {
			let inputNum: string = await context.parseVariablesInString(String(feedback.options.input!))
			let inputId = Number(simpleEval(inputNum))-1
	
			return inputId == state.queuedOp?.src && state.selectedDestination == state.queuedOp?.dest
		},
	}


	feedbacks['take_tally_dest'] = {
		type: 'boolean',
		name: 'Change background color if the selected destination is queued in take',
		description: 'If the selected destination is queued for take, change background color of the bank',
		defaultStyle: {
			color: combineRgb(255, 255, 255),
			bgcolor: combineRgb(255, 0, 0),
		},
		options: [
			{
				type: 'dropdown',
				label: 'Output',
				id: 'output',
				default: 0,
				choices: outputChoices,
			},
		],
		callback: (feedback) => {
			return Number(feedback.options.output) == state.queuedOp?.dest
		},
	}

	feedbacks['take_tally_dest_dyn'] = {
		type: 'boolean',
		name: 'Change background color if the selected destination is queued in take (dynamic)',
		description: 'If the selected destination is queued for take, change background color of the bank',
		defaultStyle: {
			color: combineRgb(255, 255, 255),
			bgcolor: combineRgb(255, 0, 0),
		},
		options: [
			{
				type: 'textinput',
				label: 'Output',
				id: 'output',
				default: '',
				useVariables: {local: true}
			},
		],
		callback: async function (feedback, context) {
			let outputNum: string = await context.parseVariablesInString(String(feedback.options.output!))
			let outputId = Number(simpleEval(outputNum))-1
			return outputId == state.queuedOp?.dest
		},
	}


	return feedbacks
}
