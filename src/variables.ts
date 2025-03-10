import type { CompanionVariableDefinition, CompanionVariableValues, InstanceBase } from '@companion-module/base'
import type { VideoHubConfig } from './config.js'
import type { VideohubState } from './state.js'
import { LOCKSTATES } from './choices.js'

/**
 * Initialize variables.
 */
export function initVariables(self: InstanceBase<VideoHubConfig>, state: VideohubState): void {
	const variableDefinitions: CompanionVariableDefinition[] = []
	const variableValues: CompanionVariableValues = {}

	for (const input of state.iterateInputs()) {
		if (input.status != 'None') {
			variableDefinitions.push({
				name: `Label of input ${input.id + 1}`,
				variableId: `input_${input.id + 1}`,
			})

			variableValues[`input_${input.id + 1}`] = input.name
		}
	}

	for (const output of state.iterateAllOutputs()) {
		if (output.status != 'None') {
			const outputType = output.type === 'primary' ? 'output' : 'monitor'

			variableDefinitions.push({
				name: `Label of ${outputType} ${output.id + 1}`,
				variableId: `output_${output.outputId + 1}`,
			})

			variableValues[`output_${output.outputId + 1}`] = output.name

			variableDefinitions.push({
				name: `Label of input routed to ${outputType} ${output.id + 1}`,
				variableId: `output_${output.outputId + 1}_input`,
			})

			variableValues[`output_${output.outputId + 1}_input`] = state.getInput(output.route)?.name ?? '?'

			variableDefinitions.push({
				name: `Id of input routed to ${outputType} ${output.id + 1}`,
				variableId: `output_${output.outputId + 1}_input_id`,
			})

			const activeId: number | undefined = state.getInput(output.route)?.id
			variableValues[`output_${output.outputId + 1}_input_id`] = activeId !== undefined ? activeId + 1 : '?'

			variableDefinitions.push({
				name: `Lock state of ${outputType} ${output.id + 1}`,
				variableId: `output_${output.outputId + 1}_lock_state`,
			})

			variableValues[`output_${output.outputId + 1}_lock_state`] = LOCKSTATES[output?.lock] ?? '?'
		}
	}

	for (const serial of state.iterateSerials()) {
		if (serial.status != 'None') {
			variableDefinitions.push({
				name: `Label of serial port ${serial.id + 1}`,
				variableId: `serial_${serial.id + 1}`,
			})

			variableValues[`serial_${serial.id + 1}`] = serial.name

			variableDefinitions.push({
				name: `Label of serial routed to serial power ${serial.id + 1}`,
				variableId: `serial_${serial.id + 1}_route`,
			})

			const sourceSerial = state.getSerial(serial.route)
			variableValues[`serial_${serial.id + 1}_route`] = sourceSerial?.name ?? '?'

			variableDefinitions.push({
				name: `Lock state of serial ${serial.id + 1}`,
				variableId: `serial_${serial.id + 1}_lock_state`,
			})

			variableValues[`serial_${serial.id + 1}_lock_state`] = LOCKSTATES[serial?.lock] ?? '?'
		}
	}

	variableDefinitions.push({
		name: 'Label of selected destination',
		variableId: 'selected_destination',
	})

	variableDefinitions.push({
		name: 'Label of input routed to selected destination',
		variableId: 'selected_source',
	})

	variableDefinitions.push({
		name: 'Label of selected source',
		variableId: 'selected_queued_source',
	})

	updateSelectedDestinationVariables(state, variableValues)

	self.setVariableDefinitions(variableDefinitions)
	self.setVariableValues(variableValues)
}

export function updateSelectedDestinationVariables(
	state: VideohubState,
	variableValues: CompanionVariableValues
): void {
	const selectedOutput = state.getSelectedOutput()
	const inputForSelectedOutput = selectedOutput ? state.getInput(selectedOutput.route) : undefined
	const selectedQueuedSource =
		state.queuedOp && state.queuedOp.src !== undefined ? state.getInput(state.queuedOp.src) : undefined

	variableValues['selected_destination'] = selectedOutput?.name ?? '?'

	variableValues['selected_source'] = inputForSelectedOutput?.name ?? '?'

	variableValues['selected_queued_source'] = selectedQueuedSource?.name ?? '?'
}
