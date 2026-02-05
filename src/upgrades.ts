import {
	CompanionMigrationOptionValues,
	CompanionStaticUpgradeResult,
	CompanionStaticUpgradeScript,
	CreateConvertToBooleanFeedbackUpgradeScript,
} from '@companion-module/base'
import { VideoHubConfig } from './config.js'

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
		let changed = false
		if (
			action.actionId === 'rename_destination' ||
			action.actionId === 'route' ||
			action.actionId === 'route_routed' ||
			action.actionId === 'route_to_previous' ||
			action.actionId === 'route_serial' ||
			action.actionId === 'select_destination'
		) {
			offsetValue(action.options, 'destination')
			changed = true
		}
		if (
			action.actionId === 'rename_source' ||
			action.actionId === 'route' ||
			action.actionId === 'route_serial' ||
			action.actionId === 'route_source'
		) {
			offsetValue(action.options, 'source')
			changed = true
		}
		if (action.actionId === 'rename_serial' || action.actionId === 'lock_serial') {
			offsetValue(action.options, 'serial')
			changed = true
		}
		if (action.actionId === 'route_routed') {
			offsetValue(action.options, 'source_routed_to_destination')
			changed = true
		}
		if (action.actionId === 'lock_output') {
			offsetValue(action.options, 'output')
			changed = true
		}

		if (changed) result.updatedActions.push(action)
	}
	for (const feedback of props.feedbacks) {
		let changed = false

		if (
			feedback.feedbackId === 'input_bg' ||
			feedback.feedbackId === 'serial_bg' ||
			feedback.feedbackId === 'selected_source' ||
			feedback.feedbackId === 'take_tally_source'
		) {
			offsetValue(feedback.options, 'input')
			changed = true
		}
		if (
			feedback.feedbackId === 'input_bg' ||
			feedback.feedbackId === 'serial_bg' ||
			feedback.feedbackId === 'selected_destination' ||
			feedback.feedbackId === 'take_tally_dest' ||
			feedback.feedbackId === 'lock_output'
		) {
			offsetValue(feedback.options, 'output')
			changed = true
		}
		if (feedback.feedbackId === 'lock_serial') {
			offsetValue(feedback.options, 'serial')
			changed = true
		}

		if (changed) result.updatedFeedbacks.push(feedback)
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

	//

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
	// mergeDynSuffixToBeExpressions,
]
