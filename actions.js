import fs from 'fs/promises'

/**
 * Get the available actions.
 *
 * !!! Utilized by bmd-multiview16 !!!
 *
 * @returns {Object[]} the available actions
 * @access public
 * @since 1.2.0
 */
export function getActions() {
	const actions = {}

	const sendCommand = (cmd) => {
		if (this.socket !== undefined && this.socket.connected) {
			try {
				this.socket.send(cmd)
			} catch (error) {
				this.log('error', 'TCP error ' + error.message)
			}
		} else {
			this.log('error', 'Socket not connected ')
			this.init_tcp()
		}
	}

	actions['rename_destination'] = {
		name: 'Rename destination',
		options: [
			{
				type: 'dropdown',
				label: 'Destination',
				id: 'destination',
				default: '0',
				choices: this.CHOICES_OUTPUTS,
			},
			{
				type: 'textinput',
				label: 'New label',
				id: 'label',
				default: 'Dest name',
			},
		],
		callback: (action) => {
			if (parseInt(action.options.destination) >= this.outputCount) {
				sendCommand(
					'MONITORING OUTPUT LABELS:\n' +
						(parseInt(action.options.destination) - this.outputCount) +
						' ' +
						action.options.label +
						'\n\n'
				)
			} else {
				sendCommand('OUTPUT LABELS:\n' + action.options.destination + ' ' + action.options.label + '\n\n')
			}
		},
	}
	actions['rename_source'] = {
		name: 'Rename source',
		options: [
			{
				type: 'dropdown',
				label: 'Source',
				id: 'source',
				default: '0',
				choices: this.CHOICES_INPUTS,
			},
			{
				type: 'textinput',
				label: 'New label',
				id: 'label',
				default: 'Src name',
			},
		],
		callback: (action) => {
			sendCommand('INPUT LABELS:\n' + action.options.source + ' ' + action.options.label + '\n\n')
		},
	}

	if (this.serialCount > 0) {
		actions['rename_serial'] = {
			name: 'Rename serial port',
			options: [
				{
					type: 'dropdown',
					label: 'Serial Port',
					id: 'serial',
					default: '0',
					choices: this.CHOICES_SERIALS,
				},
				{
					type: 'textinput',
					label: 'New label',
					id: 'label',
					default: 'Serial name',
				},
			],
			callback: (action) => {
				sendCommand('SERIAL PORT LABELS:\n' + action.options.serial + ' ' + action.options.label + '\n\n')
			},
		}
	}

	actions['route'] = {
		name: 'Route',
		options: [
			{
				type: 'dropdown',
				label: 'Source',
				id: 'source',
				default: '0',
				choices: this.CHOICES_INPUTS,
			},
			{
				type: 'dropdown',
				label: 'Destination',
				id: 'destination',
				default: '0',
				choices: this.CHOICES_OUTPUTS,
			},
		],
		callback: (action) => {
			if (parseInt(action.options.destination) >= this.outputCount) {
				sendCommand(
					'VIDEO MONITORING OUTPUT ROUTING:\n' +
						(parseInt(action.options.destination) - this.outputCount) +
						' ' +
						action.options.source +
						'\n\n'
				)
			} else {
				sendCommand('VIDEO OUTPUT ROUTING:\n' + action.options.destination + ' ' + action.options.source + '\n\n')
			}
		},
	}

	actions['route_routed'] = {
		name: 'Route source routed to given destination',
		options: [
			{
				type: 'dropdown',
				label: 'Destination to take routed source from',
				id: 'source_routed_to_destination',
				default: '0',
				choices: this.CHOICES_OUTPUTS,
			},
			{
				type: 'dropdown',
				label: 'Destination',
				id: 'destination',
				default: '0',
				choices: this.CHOICES_OUTPUTS,
			},
		],
		callback: (action) => {
			if (parseInt(action.options.destination) >= this.outputCount) {
				sendCommand(
					'VIDEO MONITORING OUTPUT ROUTING:\n' +
						(parseInt(action.options.destination) - this.outputCount) +
						' ' +
						action.options.source +
						'\n\n'
				)
			} else {
				sendCommand(
					'VIDEO OUTPUT ROUTING:\n' +
						action.options.destination +
						' ' +
						this.getOutput(parseInt(action.options.source_routed_to_destination)).route +
						'\n\n'
				)
			}
		},
	}

	actions['route_to_previous'] = {
		name: 'Return to previous route',
		options: [
			{
				type: 'dropdown',
				label: 'Destination',
				id: 'destination',
				default: '0',
				choices: this.CHOICES_OUTPUTS,
			},
		],
		callback: (action) => {
			let output = this.getOutput(parseInt(action.options.destination))
			let fallbackpop = -1

			fallbackpop = output.fallback.pop() // The current route (i.e what the hardware is actually set to)
			// has already been pushed onto the stack at "updateRouting" so to
			// get to the last route we have to first pop this one off.
			fallbackpop = output.fallback.pop() // This now, is the route to fallback to.

			if (output.fallback.length < 1) {
				output.fallback.push(-1)
			}

			if (fallbackpop >= 0) {
				if (parseInt(action.options.destination) >= this.outputCount) {
					sendCommand(
						'VIDEO MONITORING OUTPUT ROUTING:\n' +
							(parseInt(action.options.destination) - this.outputCount) +
							' ' +
							fallbackpop +
							'\n\n'
					)
				} else {
					sendCommand('VIDEO OUTPUT ROUTING:\n' + action.options.destination + ' ' + fallbackpop + '\n\n')
				}
			}
		},
	}

	if (this.serialCount > 0) {
		actions['route_serial'] = {
			name: 'Route serial port',
			options: [
				{
					type: 'dropdown',
					label: 'Source',
					id: 'source',
					default: '0',
					choices: this.CHOICES_SERIALS,
				},
				{
					type: 'dropdown',
					label: 'Destination',
					id: 'destination',
					default: '1',
					choices: this.CHOICES_SERIALS,
				},
			],
			callback: (action) => {
				sendCommand('SERIAL PORT ROUTING:\n' + action.options.destination + ' ' + action.options.source + '\n\n')
			},
		}
	}

	actions['select_destination'] = {
		name: 'Select destination',
		options: [
			{
				type: 'dropdown',
				label: 'Destination',
				id: 'destination',
				default: '0',
				choices: this.CHOICES_OUTPUTS,
			},
		],
		callback: (action) => {
			this.selected = parseInt(action.options.destination)

			this.checkFeedbacks('selected_destination', 'take_tally_source', 'selected_source')
		},
	}
	actions['route_source'] = {
		name: 'Route source to selected destination',
		options: [
			{
				type: 'dropdown',
				label: 'Source',
				id: 'source',
				default: '0',
				choices: this.CHOICES_INPUTS,
			},
		],
		callback: (action) => {
			if (this.selected >= this.outputCount) {
				if (this.config.take === true) {
					this.queue =
						'VIDEO MONITORING OUTPUT ROUTING:\n' +
						(this.selected - this.outputCount) +
						' ' +
						action.options.source +
						'\n\n'
					this.queuedDest = this.selected - this.outputCount
					this.queuedSource = parseInt(action.options.source)

					this.checkFeedbacks('take', 'take_tally_source', 'take_tally_dest', 'take_tally_route')
				} else {
					sendCommand(
						'VIDEO MONITORING OUTPUT ROUTING:\n' +
							(this.selected - this.outputCount) +
							' ' +
							action.options.source +
							'\n\n'
					)
				}
			} else {
				if (this.config.take === true) {
					this.queue = 'VIDEO OUTPUT ROUTING:\n' + this.selected + ' ' + action.options.source + '\n\n'
					this.queuedDest = this.selected
					this.queuedSource = parseInt(action.options.source)

					this.checkFeedbacks('take', 'take_tally_source', 'take_tally_dest', 'take_tally_route')
				} else {
					sendCommand('VIDEO OUTPUT ROUTING:\n' + this.selected + ' ' + action.options.source + '\n\n')
				}
			}
		},
	}

	actions['take'] = {
		name: 'Take',
		options: [],
		callback: () => {
			const cmd = this.queue

			this.queue = ''
			this.queuedDest = -1
			this.queuedSource = -1

			this.checkFeedbacks('take', 'take_tally_source', 'take_tally_dest', 'take_tally_route')

			sendCommand(cmd)
		},
	}
	actions['clear'] = {
		name: 'Clear',
		options: [],
		callback: () => {
			this.queue = ''
			this.queuedDest = -1
			this.queuedSource = -1

			this.checkFeedbacks('take', 'take_tally_source', 'take_tally_dest', 'take_tally_route')
		},
	}

	actions['load_route_from_file'] = {
		name: 'Load Routes File',
		options: [
			{
				type: 'textinput',
				label: 'Source File',
				id: 'source_file',
				default: 'C:\\VideoHub.txt',
			},
		],
		callback: async (action) => {
			try {
				const data = await fs.readFile(action.options.source_file, 'utf8')
				try {
					let cmd = ''

					const routes_text = data.split(':')
					const routes = routes_text[0].split(',')
					if (routes.length > 0 && routes.length <= this.outputCount) {
						cmd = ''
						for (let index = 0; index < routes.length; index++) {
							const dest_source = routes[index].split(' ')
							if (isNaN(dest_source[0])) {
								throw routes[index] + ' - ' + dest_source[0] + ' is not a valid Router Destination '
							}
							if (dest_source[0] < 0 || dest_source[0] > this.outputCount - 1) {
								throw (
									dest_source[0] +
									'  is an invalid destination.  Remember, Router is zero based when indexing ports.  Max Routes for this router = ' +
									this.outputCount
								)
							}
							if (isNaN(dest_source[1])) {
								throw routes[index] + ' - ' + dest_source[1] + ' is not a valid Router Source '
							}
							if (dest_source[1] < 0 || dest_source[1] > this.outputCount - 1) {
								throw (
									dest_source[1] +
									'  is an invalid source. Remember, Router is zero based when indexing ports.  Max Routes for this router = ' +
									this.outputCount
								)
							}
							cmd = cmd + 'VIDEO OUTPUT ROUTING:\n' + routes[index] + '\n\n'
						}
					} else {
						throw 'Invalid number of Routes: ' + routes.length + ','
					}

					sendCommand(cmd)
					this.log('info', routes.length + ' Routes read from File: ' + action.options.source_file)
				} catch (err) {
					this.log('error', err + ' in File:' + action.options.source_file)
				}
			} catch (e) {
				this.log('error', 'File Read Error: ' + e.message)
			}
		},
	}

	actions['store_route_in_file'] = {
		name: 'Save Routes File',
		options: [
			{
				type: 'textinput',
				label: 'Destination File',
				id: 'destination_file',
				default: 'C:\\VideoHub.txt',
			},
		],
		callback: async (action) => {
			let string =
				"  : BMD uses zero based indexing when referencing source and destination so '0' in this file references port '1'.  You may add your own text here after the colon. \n"
			string = string + '\nRouting history: \n'

			for (let index = 0; index < this.outputCount; index++) {
				data[index] = index + ' ' + this.getOutput(index).route
				string = string + index + '  ' + this.getOutput(index).fallback + '\n'
			}

			try {
				await fs.writeFile(action.options.destination_file, data + string, 'utf8')
				this.log('info', data.length + ' Routes written to: ' + action.options.destination_file)
			} catch (e) {
				this.log('error', 'File Write Error: ' + e.message)
			}
		},
	}

	return actions
}
