import { combineRgb, CompanionFeedbackDefinitions } from '@companion-module/base'
import { getInputChoices } from './choices.js'
import { VideohubState } from './state.js'
import type { InstanceBaseExt } from './types.js'

export type FeedbackSchema = {
	input_bg: {
		type: 'boolean'
		options: {
			input: number
			output: number
		}
	}
	serial_bg: {
		type: 'boolean'
		options: {
			input: number
			output: number
		}
	}
	selected_destination: {
		type: 'boolean'
		options: {
			output: number
		}
	}
	selected_source: {
		type: 'boolean'
		options: {
			input: number
		}
	}
	take: {
		type: 'boolean'
		options: Record<string, never>
	}
	take_tally_source: {
		type: 'boolean'
		options: {
			input: number
		}
	}
	take_tally_dest: {
		type: 'boolean'
		options: {
			output: number
		}
	}
	lock_output: {
		type: 'boolean'
		options: {
			output: number
		}
	}
	lock_serial: {
		type: 'boolean'
		options: {
			serial: number
		}
	}
}

/**
 * Get the available feedbacks.
 */
export function getFeedbacks(
	self: InstanceBaseExt,
	state: VideohubState,
): CompanionFeedbackDefinitions<FeedbackSchema> {
	const { inputChoices, outputChoices, serialChoices } = getInputChoices(state, true)

	const feedbacks: CompanionFeedbackDefinitions<FeedbackSchema> = {
		input_bg: {
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
					default: 1,
					choices: inputChoices,
				},
				{
					type: 'dropdown',
					label: 'Destination',
					id: 'output',
					default: 1,
					choices: outputChoices,
				},
			],
			callback: (feedback) => {
				return state.getOutputById(Number(feedback.options.output) - 1)?.route == Number(feedback.options.input) - 1
			},
		},

		serial_bg: serialChoices.length > 0 && {
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
					default: 1,
					choices: serialChoices,
				},
				{
					type: 'dropdown',
					label: 'Destination',
					id: 'output',
					default: 1,
					choices: serialChoices,
				},
			],
			callback: (feedback) => {
				return state.getSerial(Number(feedback.options.output) - 1)?.route == Number(feedback.options.input) - 1
			},
		},

		selected_destination: {
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
					default: 1,
					choices: outputChoices,
				},
			],
			callback: (feedback) => {
				self.log('debug', 'selected source : ' + state.selectedDestination)
				return Number(feedback.options.output) - 1 == state.selectedDestination
			},
		},

		selected_source: {
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
					default: 1,
					choices: inputChoices,
				},
			],
			callback: (feedback) => {
				return state.getSelectedOutput()?.route == Number(feedback.options.input) - 1
			},
		},

		take: {
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
		},

		take_tally_source: {
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
					default: 1,
					choices: inputChoices,
				},
			],
			callback: (feedback) => {
				return (
					Number(feedback.options.input) == state.queuedOp?.src &&
					state.selectedDestination == state.queuedOp?.output.outputId
				)
			},
		},

		take_tally_dest: {
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
					default: 1,
					choices: outputChoices,
				},
			],
			callback: (feedback) => {
				return Number(feedback.options.output) - 1 == state.queuedOp?.output.outputId
			},
		},

		lock_output: {
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
					default: 1,
					choices: outputChoices,
				},
			],
			callback: async function (feedback) {
				const output = state.getOutputById(Number(feedback.options.output) - 1)
				if (!output) return false

				return output.lock != 'U'
			},
		},

		lock_serial: serialChoices.length > 0 && {
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
					default: 1,
					choices: serialChoices,
				},
			],
			callback: async function (feedback) {
				const serial = state.getSerial(Number(feedback.options.serial) - 1)
				if (!serial) return false

				return serial.lock != 'U'
			},
		},
	}

	return feedbacks
}
