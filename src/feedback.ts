import { combineRgb, CompanionFeedbackDefinitions } from '@companion-module/base'
import { getInputChoices } from './choices.js'
import { VideohubState } from './state.js'

/**
 * Get the available feedbacks.
 */
export function getFeedbacks(state: VideohubState): CompanionFeedbackDefinitions {
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
			return Number(feedback.options.output) == state.selectedDestination
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

	return feedbacks
}
