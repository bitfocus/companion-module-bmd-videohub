module.exports = {

	/**
	 * INTERNAL: initialize variables.
	 *
	 * @access protected
	 * @since 1.0.0
	 */
	initVariables() {
		var variables = [];

		for (var i = 0; i < this.inputCount; i++) {

			if (this.getInput(i).status != 'None') {
				variables.push({
					label: 'Label of input ' + (i+1),
					name: 'input_' + (i+1)
				});

				this.setVariable('input_' + (i+1), this.getInput(i).name);
			}
		}

		for (var i = 0; i < (this.outputCount + this.monitoringCount); i++) {

			if (this.getOutput(i).status != 'None') {

				variables.push({
					label: 'Label of output ' + (i+1),
					name: 'output_' + (i+1)
				});

				this.setVariable('output_' + (i+1), this.getOutput(i).name);

				variables.push({
					label: 'Label of input routed to output ' + (i+1),
					name: 'output_' + (i+1) + '_input'
				});

				this.setVariable('output_' + (i+1) + '_input',  this.getInput(this.getOutput(i).route).name);
			}
		}

		if (this.serialCount > 0) {

			for (var i = 0; i < this.serialCount; i++) {

				if (this.getSerial(i).status != 'None') {
					variables.push({
						label: 'Label of serial port ' + (i+1),
						name: 'serial_' + (i+1)
					});

					this.setVariable('serial_' + (i+1), this.getSerial(i).name);

					variables.push({
						label: 'Label of serial routed to serial power ' + (i+1),
						name: 'serial_' + (i+1) + '_route'
					});

					this.setVariable('serial_' + (i+1) + '_route', this.getSerial(this.getSerial(i).route).name);
				}
			}
		}

		variables.push({
			label: 'Label of selected destination',
			name: 'selected_destination'
		});

		this.setVariable('selected_destination', this.getOutput(this.selected).name);

		variables.push({
			label: 'Label of input routed to selection',
			name: 'selected_source'
		});

		this.setVariable('selected_source', this.getInput(this.getOutput(this.selected).route).name);

		this.setVariableDefinitions(variables);
	}
}