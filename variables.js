/**
 * Initialize variables.
 */
export function initVariables(self) {
	const variableDefinitions = []
	const variableValues = {}

	for (let i = 0; i < self.inputCount; i++) {
		if (self.getInput(i).status != 'None') {
			variableDefinitions.push({
				name: 'Label of input ' + (i + 1),
				variableId: 'input_' + (i + 1),
			})

			variableValues['input_' + (i + 1)] = self.getInput(i).name
		}
	}

	for (let i = 0; i < self.outputCount + self.monitoringCount; i++) {
		if (self.getOutput(i).status != 'None') {
			variableDefinitions.push({
				name: 'Label of output ' + (i + 1),
				variableId: 'output_' + (i + 1),
			})

			variableValues['output_' + (i + 1)] = self.getOutput(i).name

			variableDefinitions.push({
				name: 'Label of input routed to output ' + (i + 1),
				variableId: 'output_' + (i + 1) + '_input',
			})

			variableValues['output_' + (i + 1) + '_input'] = self.getInput(self.getOutput(i).route).name
		}
	}

	if (self.serialCount > 0) {
		for (let i = 0; i < self.serialCount; i++) {
			if (self.getSerial(i).status != 'None') {
				variableDefinitions.push({
					name: 'Label of serial port ' + (i + 1),
					variableId: 'serial_' + (i + 1),
				})

				variableValues['serial_' + (i + 1)] = self.getSerial(i).name

				variableDefinitions.push({
					name: 'Label of serial routed to serial power ' + (i + 1),
					variableId: 'serial_' + (i + 1) + '_route',
				})

				variableValues['serial_' + (i + 1) + '_route'] = self.getSerial(self.getSerial(i).route).name
			}
		}
	}

	variableDefinitions.push({
		name: 'Label of selected destination',
		variableId: 'selected_destination',
	})

	variableValues['selected_destination'] = self.getOutput(self.selected).name

	variableDefinitions.push({
		name: 'Label of input routed to selection',
		variableId: 'selected_source',
	})

	variableValues['selected_source'] = self.getInput(self.getOutput(self.selected).route).name

	self.setVariableDefinitions(variableDefinitions)
	self.setVariableValues(variableValues)
}
