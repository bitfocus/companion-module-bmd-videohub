module.exports = {

	/**
	 * Get the available actions.
	 * 
	 * !!! Utilized by bmd-multiview16 !!!
	 *
	 * @returns {Object[]} the available actions
	 * @access public
	 * @since 1.2.0
	 */
	getActions() {
		var actions = {};

		actions['rename_destination'] = {
			label: 'Rename destination',
			options: [
				{
					type: 'dropdown',
					label: 'Destination',
					id: 'destination',
					default: '0',
					choices: this.CHOICES_OUTPUTS
				},
				{
					type: 'textinput',
					label: 'New label',
					id: 'label',
					default: "Dest name"
				}
			]
		};
		actions['rename_source'] ={
			label: 'Rename source',
			options: [
				{
					type: 'dropdown',
					label: 'Source',
					id: 'source',
					default: '0',
					choices: this.CHOICES_INPUTS
				},
				{
					type: 'textinput',
					label: 'New label',
					id: 'label',
					default: "Src name"
				}
			]
		};

		if (this.serialCount > 0) {
			actions['rename_serial'] ={
				label: 'Rename serial port',
				options: [
					{
						type: 'dropdown',
						label: 'Serial Port',
						id: 'serial',
						default: '0',
						choices: this.CHOICES_SERIALS
					},
					{
						type: 'textinput',
						label: 'New label',
						id: 'label',
						default: "Serial name"
					}
				]
			};
		}

		actions['route'] = {
			label: 'Route',
			options: [
				{
					type: 'dropdown',
					label: 'Source',
					id: 'source',
					default: '0',
					choices: this.CHOICES_INPUTS
				},
				{
					type: 'dropdown',
					label: 'Destination',
					id: 'destination',
					default: '0',
					choices: this.CHOICES_OUTPUTS
				}
			]
		};

		if (this.serialCount > 0) {
			actions['route_serial'] = {
				label: 'Route serial port',
				options: [
					{
						type: 'dropdown',
						label: 'Source',
						id: 'source',
						default: '0',
						choices: this.CHOICES_SERIALS
					},
					{
						type: 'dropdown',
						label: 'Destination',
						id: 'destination',
						default: '1',
						choices: this.CHOICES_SERIALS
					}
				]
			};
		}

		actions['select_destination'] = {
			label: 'Select destination',
			options: [
				{
					type: 'dropdown',
					label: 'Destination',
					id: 'destination',
					default: '0',
					choices: this.CHOICES_OUTPUTS
				}
			]
		};
		actions['route_source'] = {
			label: 'Route source to selected destination',
			options: [
				{
					type: 'dropdown',
					label: 'Source',
					id: 'source',
					default: '0',
					choices: this.CHOICES_INPUTS
				}
			]
		};

		actions['take']  = { label: 'Take' };
		actions['clear'] = { label: 'Clear' };

		return actions;
	}
}