import {
	CompanionMigrationOptionValues,
	CompanionStaticUpgradeResult,
	CompanionStaticUpgradeScript,
	CreateConvertToBooleanFeedbackUpgradeScript,
} from '@companion-module/base'
import { VideoHubConfig } from './config.js'

const fixupActionsForExpressions: {
	basicName: string
	dynName: string | null
	numberProps: string[]
}[] = [
	{
		basicName: 'rename_destination',
		dynName: null,
		numberProps: ['destination'],
	},
	{
		basicName: 'rename_source',
		dynName: null,
		numberProps: ['source'],
	},
	{
		basicName: 'rename_serial',
		dynName: null,
		numberProps: ['serial'],
	},
	{
		basicName: 'route',
		dynName: 'route_dyn',
		numberProps: ['source', 'destination'],
	},
	{
		basicName: 'route_routed',
		dynName: 'route_routed_dyn',
		numberProps: ['source_routed_to_destination', 'destination'],
	},
	{
		basicName: 'route_to_previous',
		dynName: 'route_to_previous_dyn',
		numberProps: ['destination'],
	},
	{
		basicName: 'route_serial',
		dynName: 'route_serial_dyn',
		numberProps: ['source', 'destination'],
	},
	{
		basicName: 'select_destination',
		dynName: 'select_destination_dyn',
		numberProps: ['destination'],
	},
	{
		basicName: 'route_source',
		dynName: 'route_source_dyn',
		numberProps: ['source'],
	},
	{
		basicName: 'lock_output',
		dynName: 'lock_output_dyn',
		numberProps: ['output'],
	},
	{
		basicName: 'lock_serial',
		dynName: 'lock_serial_dyn',
		numberProps: ['serial'],
	},
]
const fixupFeedbacksForExpressions: {
	basicName: string
	dynName: string
	numberProps: string[]
}[] = [
	{
		basicName: 'input_bg',
		dynName: 'input_bg_dyn',
		numberProps: ['input', 'output'],
	},
	{
		basicName: 'serial_bg',
		dynName: 'serial_bg_dyn',
		numberProps: ['input', 'output'],
	},
	{
		basicName: 'selected_destination',
		dynName: 'selected_destination_dyn',
		numberProps: ['output'],
	},
	{
		basicName: 'selected_source',
		dynName: 'selected_source_dyn',
		numberProps: ['input'],
	},
	{
		basicName: 'take_tally_source',
		dynName: 'take_tally_source_dyn',
		numberProps: ['input'],
	},
	{
		basicName: 'take_tally_dest',
		dynName: 'take_tally_dest_dyn',
		numberProps: ['output'],
	},
	{
		basicName: 'lock_output',
		dynName: 'lock_output_dyn',
		numberProps: ['output'],
	},
	{
		basicName: 'lock_serial',
		dynName: 'lock_serial_dyn',
		numberProps: ['serial'],
	},
]

/**
 * Since Companion 4.3, users can provide every value as an expression
 * To make this easier for them, ensure numbers are 1 based (not 0 based)
 */
const offsetZeroBasedNumbers: CompanionStaticUpgradeScript<VideoHubConfig> = (_ctx, props) => {
	const result: CompanionStaticUpgradeResult<VideoHubConfig, undefined> = {
		updatedConfig: null,
		updatedSecrets: null,
		updatedActions: [],
		updatedFeedbacks: [],
	}

	const offsetValue = (options: CompanionMigrationOptionValues, key: string) => {
		if (!options[key]) return

		if (options[key].isExpression) {
			options[key].value = `${options[key].value} + 1`
		} else {
			options[key].value = Number(options[key].value) + 1
		}
	}

	for (const action of props.actions) {
		const rule = fixupActionsForExpressions.find((r) => r.basicName === action.actionId)
		if (!rule) continue

		for (const prop of rule.numberProps) {
			offsetValue(action.options, prop)
		}

		result.updatedActions.push(action)
	}
	for (const feedback of props.feedbacks) {
		const rule = fixupFeedbacksForExpressions.find((r) => r.basicName === feedback.feedbackId)
		if (!rule) continue

		for (const prop of rule.numberProps) {
			offsetValue(feedback.options, prop)
		}

		result.updatedFeedbacks.push(feedback)
	}

	return result
}
/**
 * Since Companion 4.3, users can provide every value as an expression
 * Meaning we don't need separate "dyn" actions for dynamic values,
 * we can merge existing usages into the 'basic' actions/feedbacks in expression mode
 */
const mergeDynSuffixToBeExpressions: CompanionStaticUpgradeScript<VideoHubConfig> = (_ctx, props) => {
	const result: CompanionStaticUpgradeResult<VideoHubConfig, undefined> = {
		updatedConfig: null,
		updatedSecrets: null,
		updatedActions: [],
		updatedFeedbacks: [],
	}

	const fixupNumericValue = (options: CompanionMigrationOptionValues, key: string) => {
		const oldVal = options[key]
		if (!oldVal) return

		// Nothing to do if already an expression!
		if (oldVal.isExpression) return

		const oldValNum = Number(oldVal.value)
		const oldValRaw = oldVal.value
		if (typeof oldVal.value === 'number' || !isNaN(oldValNum)) {
			// It looks like a plain number, so store it as one
			options[key] = {
				isExpression: false,
				value: oldValNum,
			}
		} else if (typeof oldValRaw === 'string') {
			const trimmedStr = oldValRaw.trim()
			// Crudely check if it looks like a simple variable
			if (trimmedStr.startsWith('$(') && trimmedStr.endsWith(')') && !trimmedStr.slice(2).includes('$(')) {
				// It does, so we can treat that as a plain expression!
				options[key] = {
					isExpression: true,
					value: oldValRaw,
				}
			} else {
				// Otherwise its something more complex, so wrap it in a parseVariables and hope for the best!
				options[key] = {
					isExpression: true,
					value: `parseVariables("${oldValRaw.replace(/"/g, '\\"')}")`,
				}
			}
		} else {
			// Its not a string, or anything vaguely sane..
			// Nothing really we can do
		}
	}

	for (const action of props.actions) {
		const rule = fixupActionsForExpressions.find((r) => r.dynName && r.dynName === action.actionId)
		if (!rule) continue

		action.actionId = rule.basicName
		for (const prop of rule.numberProps) {
			fixupNumericValue(action.options, prop)
		}

		if (action.actionId === 'lock_output' || action.actionId === 'lock_serial') {
			// Special case for lock state, as it is not a number, and should be wrapped as an expression
			if (action.options.lock_state && !action.options.lock_state.isExpression) {
				action.options.lock_state = {
					isExpression: true,
					value: `parseVariables("${action.options.lock_state.value}")`,
				}
			}
		}

		result.updatedActions.push(action)
	}

	for (const feedback of props.feedbacks) {
		const rule = fixupFeedbacksForExpressions.find((r) => r.dynName === feedback.feedbackId)
		if (!rule) continue

		feedback.feedbackId = rule.basicName
		for (const prop of rule.numberProps) {
			fixupNumericValue(feedback.options, prop)
		}

		result.updatedFeedbacks.push(feedback)
	}

	return result
}

export const UpgradeScripts: CompanionStaticUpgradeScript<VideoHubConfig>[] = [
	CreateConvertToBooleanFeedbackUpgradeScript({
		input_bg: true,
		serial_bg: true,
		selected_destination: true,
		selected_source: true,
		take: true,
		take_tally_source: true,
		take_tally_dest: true,
	}),
	offsetZeroBasedNumbers,
	mergeDynSuffixToBeExpressions,
]
