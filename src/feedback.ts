import { combineRgb, CompanionFeedbackDefinitions } from '@companion-module/base'
import { getInputChoices } from './choices.js'
import { VideohubState } from './state.js'

/**
 * Get the available feedbacks.
 *
 * !!! Utilized by bmd-multiview16 !!!
 */
export function getFeedbacks(state: VideohubState): CompanionFeedbackDefinitions {
	const { inputChoices, outputChoices, serialChoices } = getInputChoices(state)

	const feedbacks: CompanionFeedbackDefinitions = {}

	feedbacks['input_bg'] = {
		type: 'advanced',
		name: 'Change background color by destination',
		description: 'If the input specified is in use by the output specified, change background color of the bank',
		options: [
			{
				type: 'colorpicker',
				label: 'Foreground color',
				id: 'fg',
				default: combineRgb(0, 0, 0),
			},
			{
				type: 'colorpicker',
				label: 'Background color',
				id: 'bg',
				default: combineRgb(255, 255, 0),
			},
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
			if (state.getOutputById(Number(feedback.options.output))?.route == Number(feedback.options.input)) {
				return {
					color: Number(feedback.options.fg),
					bgcolor: Number(feedback.options.bg),
				}
			} else {
				return {}
			}
		},
	}

	if (serialChoices.length > 0) {
		feedbacks['serial_bg'] = {
			type: 'advanced',
			name: 'Change background color by serial route',
			description: 'If the input specified is in use by the output specified, change background color of the bank',
			options: [
				{
					type: 'colorpicker',
					label: 'Foreground color',
					id: 'fg',
					default: combineRgb(0, 0, 0),
				},
				{
					type: 'colorpicker',
					label: 'Background color',
					id: 'bg',
					default: combineRgb(255, 255, 0),
				},
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
				if (state.getSerial(Number(feedback.options.output))?.route == Number(feedback.options.input)) {
					return {
						color: Number(feedback.options.fg),
						bgcolor: Number(feedback.options.bg),
					}
				} else {
					return {}
				}
			},
		}
	}

	feedbacks['selected_destination'] = {
		type: 'advanced',
		name: 'Change background color by selected destination',
		description: 'If the output specified is selected, change background color of the bank',
		options: [
			{
				type: 'colorpicker',
				label: 'Foreground color',
				id: 'fg',
				default: combineRgb(0, 0, 0),
			},
			{
				type: 'colorpicker',
				label: 'Background color',
				id: 'bg',
				default: combineRgb(255, 255, 0),
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
			if (Number(feedback.options.output) == state.selectedDestination) {
				return {
					color: Number(feedback.options.fg),
					bgcolor: Number(feedback.options.bg),
				}
			} else {
				return {}
			}
		},
	}

	feedbacks['selected_source'] = {
		type: 'advanced',
		name: 'Change background color by route to selected destination',
		description: 'If the input specified is in use by the selected output, change background color of the bank',
		options: [
			{
				type: 'colorpicker',
				label: 'Foreground color',
				id: 'fg',
				default: combineRgb(0, 0, 0),
			},
			{
				type: 'colorpicker',
				label: 'Background color',
				id: 'bg',
				default: combineRgb(255, 255, 255),
			},
			{
				type: 'dropdown',
				label: 'Input',
				id: 'input',
				default: 0,
				choices: inputChoices,
			},
		],
		callback: (feedback) => {
			if (state.getSelectedOutput()?.route == Number(feedback.options.input)) {
				return {
					color: Number(feedback.options.fg),
					bgcolor: Number(feedback.options.bg),
				}
			} else {
				return {}
			}
		},
	}

	feedbacks['take'] = {
		type: 'advanced',
		name: 'Change background color if take has a route queued',
		description: 'If a route is queued for take, change background color of the bank',
		options: [
			{
				type: 'colorpicker',
				label: 'Foreground color',
				id: 'fg',
				default: combineRgb(255, 255, 255),
			},
			{
				type: 'colorpicker',
				label: 'Background color',
				id: 'bg',
				default: combineRgb(255, 0, 0),
			},
		],
		callback: (feedback) => {
			if (state.queuedOp) {
				return {
					color: Number(feedback.options.fg),
					bgcolor: Number(feedback.options.bg),
				}
			} else {
				return {}
			}
		},
	}

	feedbacks['take_tally_source'] = {
		type: 'advanced',
		name: 'Change background color if the selected source is queued in take',
		description: 'If the selected source is queued for take, change background color of the bank',
		options: [
			{
				type: 'colorpicker',
				label: 'Foreground color',
				id: 'fg',
				default: combineRgb(255, 255, 255),
			},
			{
				type: 'colorpicker',
				label: 'Background color',
				id: 'bg',
				default: combineRgb(255, 0, 0),
			},
			{
				type: 'dropdown',
				label: 'Input',
				id: 'input',
				default: 0,
				choices: inputChoices,
			},
		],
		callback: (feedback) => {
			if (Number(feedback.options.input) == state.queuedOp?.src && state.selectedDestination == state.queuedOp?.dest) {
				return {
					color: Number(feedback.options.fg),
					bgcolor: Number(feedback.options.bg),
				}
			} else {
				return {}
			}
		},
	}

	feedbacks['take_tally_dest'] = {
		type: 'advanced',
		name: 'Change background color if the selected destination is queued in take',
		description: 'If the selected destination is queued for take, change background color of the bank',
		options: [
			{
				type: 'colorpicker',
				label: 'Foreground color',
				id: 'fg',
				default: combineRgb(255, 255, 255),
			},
			{
				type: 'colorpicker',
				label: 'Background color',
				id: 'bg',
				default: combineRgb(255, 0, 0),
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
			if (Number(feedback.options.output) == state.queuedOp?.dest) {
				return {
					color: Number(feedback.options.fg),
					bgcolor: Number(feedback.options.bg),
				}
			} else {
				return {}
			}
		},
	}

	return feedbacks
}
