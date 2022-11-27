import type { CompanionVariableDefinition, CompanionVariableValues, InstanceBase } from '@companion-module/base'
import type { VideoHubConfig } from './config.js'
import type { VideohubState } from './state.js'

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
			variableDefinitions.push({
				name: `Label of output ${output.id + 1}`,
				variableId: `output_${output.id + 1}`,
			})

			variableValues[`output_${output.id + 1}`] = output.name

			variableDefinitions.push({
				name: `Label of input routed to output ${output.id + 1}`,
				variableId: `output_${output.id + 1}_input`,
			})

			variableValues[`output_${output.id + 1}_input`] = state.getInput(output.route)?.name ?? '?'
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
		}
	}

	variableDefinitions.push({
		name: 'Label of selected destination',
		variableId: 'selected_destination',
	})

	const selectedOutput = state.getSelectedOutput()

	variableValues['selected_destination'] = selectedOutput?.name ?? '?'

	variableDefinitions.push({
		name: 'Label of input routed to selection',
		variableId: 'selected_source',
	})

	const inputForSelectedOutput = selectedOutput ? state.getInput(selectedOutput.route) : undefined

	variableValues['selected_source'] = inputForSelectedOutput?.name ?? '?'

	self.setVariableDefinitions(variableDefinitions)
	self.setVariableValues(variableValues)
}
