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

		actions['route_routed'] = {
			label: 'Route source routed to given destination',
			options: [
				{
					type: 'dropdown',
					label: 'Destination to take routed source from',
					id: 'source_routed_to_destination',
					default: '0',
					choices: this.CHOICES_OUTPUTS
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

		actions['route_to_previous'] = {
			label: 'Return to previous route',
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

		actions['load_route_from_file'] = {
			label: 'Load Routes File',
			options: [
								
				{
					type: 'textinput',
					label: 'Source File',
					id: 'source_file',
					default: "C:\\VideoHub.txt"
				}
			]
		};

		actions['store_route_in_file'] = {
			label: 'Save Routes File',
			options: [
								
				{
					type: 'textinput',
					label: 'Destination File',
					id: 'destination_file',
					default: "C:\\VideoHub.txt"
				}
			]
		};

		return actions;
	}
}
