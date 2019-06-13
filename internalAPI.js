module.exports = {

	/**
	 * INTERNAL: returns the desired input object.
	 *
	 * @param {number} id - the input to fetch
	 * @returns {Object} the desired input object
	 * @access protected
	 * @since 1.1.0
	 */
	getInput(id) {

		if (this.inputs[id] === undefined) {
			this.inputs[id] = {
				label:      (id+1) + ': Input ' + (id+1),
				name:       'Input ' + (id+1),
				status:     'BNC',
				lock:       'U'
			};
		}

		return this.inputs[id];
	},

	/**
	 * INTERNAL: returns the desired output object.
	 *
	 * @param {number} id - the output to fetch
	 * @returns {Object} the desired output object
	 * @access protected
	 * @since 1.1.0
	 */
	getOutput(id) {

		if (this.outputs[id] === undefined) {
			this.outputs[id] = {
				label:      (id+1) + ': Output ' + (id+1),
				name:       'Output ' + (id+1),
				route:      id,
				status:     'BNC',
				lock:       'U'
			};
		}

		return this.outputs[id];
	},

	/**
	 * INTERNAL: returns the desired serial port object.
	 *
	 * @param {number} id - the serial port to fetch
	 * @returns {Object} the desired serial port object
	 * @access protected
	 * @since 1.1.0
	 */
	getSerial(id) {

		if (this.serials[id] === undefined) {
			this.serials[id] = {
				label:      (id+1) + ': Serial ' + (id+1),
				name:       'Serial ' + (id+1),
				route:      id,
				status:     'RS422',
				lock:       'U',
				directions: 'auto'
			};
		}

		return this.serials[id];
	},

	/**
	 * INTERNAL: Updates device data from the Videohub
	 *
	 * @param {string} labeltype - the command/data type being passed
	 * @param {Object} object - the collected data
	 * @access protected
	 * @since 1.1.0
	 */
	updateDevice(labeltype, object) {

		for (var key in object) {
			var parsethis = object[key];
			var a = parsethis.split(/: /);
			var attribute = a.shift();
			var value = a.join(" ");

			switch (attribute) {
				case 'Model name':
					this.deviceName = value;
					this.log('info', 'Connected to a ' + this.deviceName);
					break;
				case 'Video inputs':
					this.config.inputCount = value;
					break;
				case 'Video outputs':
					this.config.outputCount = value;
					break;
				case 'Video monitoring outputs':
					this.config.monitoringCount = value;
					break;
				case 'Serial ports':
					this.config.serialCount = value;
					break;
			}
		}

		this.saveConfig();
	},

	/**
	 * INTERNAL: Updates variables based on data from the Videohub
	 *
	 * @param {string} labeltype - the command/data type being passed
	 * @param {Object} object - the collected data
	 * @access protected
	 * @since 1.0.0
	 */
	updateLabels(labeltype, object) {

		for (var key in object) {
			var parsethis = object[key];
			var a = parsethis.split(/ /);
			var num = parseInt(a.shift());
			var label = a.join(" ");

			switch (labeltype) {
				case 'INPUT LABELS':
					this.getInput(num).name  = label;
					this.getInput(num).label = (num+1).toString() + ': ' + label;
					this.setVariable('input_' + (num+1), label);
					break;
				case 'MONITORING OUTPUT LABELS':
					num = num + this.outputCount;
				case 'OUTPUT LABELS':
					this.getOutput(num).name  = label;
					this.getOutput(num).label = (num+1).toString() + ': ' + label;
					this.setVariable('output_' + (num+1), label);
					break;
				case 'SERIAL PORT LABELS':
					this.getSerial(num).name  = label;
					this.getSerial(num).label = (num+1).toString() + ': ' + label;
					this.setVariable('serial_' + (num+1), label);
					break;
			}
		}

		if (labeltype == 'INPUT LABELS') {

			for (var i = 0; i < (this.outputCount + this.monitoringCount); i++) {

				if (this.getOutput(i).status != 'None') {

					this.setVariable('output_' + (i+1) + '_input',  this.getInput(this.getOutput(i).route).name);
				}
			}

			this.setVariable('selected_source', this.getInput(this.getOutput(this.selected).route).name);
		}
	},

	/**
	 * INTERNAL: Updates lock states based on data from the Videohub
	 *
	 * @param {string} labeltype - the command/data type being passed
	 * @param {Object} object - the collected data
	 * @access protected
	 * @since 1.1.0
	 */
	updateLocks(labeltype, object) {

		for (var key in object) {
			var parsethis = object[key];
			var a = parsethis.split(/ /);
			var num = parseInt(a.shift());
			var label = a.join(" ");

			switch (labeltype) {
				case 'MONITORING OUTPUT LOCKS':
					num = num + this.outputCount;
				case 'VIDEO OUTPUT LOCKS':
					this.getOutput(num).lock = label;
					break;
				case 'SERIAL PORT LOCKS':
					this.getSerial(num).lock = label;
					break;
			}
		}
	},

	/**
	 * INTERNAL: Updates routing table based on data from the Videohub
	 *
	 * @param {string} labeltype - the command/data type being passed
	 * @param {Object} object - the collected data
	 * @access protected
	 * @since 1.0.0
	 */
	updateRouting(labeltype, object) {

		for (var key in object) {
			var parsethis = object[key];
			var a = parsethis.split(/ /);
			var dest = parseInt(a.shift());
			var src = parseInt(a.join(" "));

			switch (labeltype) {
				case 'VIDEO MONITORING OUTPUT ROUTING':
					dest = dest + this.outputCount;
				case 'VIDEO OUTPUT ROUTING':
					this.getOutput(dest).route = src;
					this.setVariable('output_' + (dest+1) + '_input',  this.getInput(src).name);
					break;
				case 'SERIAL PORT ROUTING':
					this.getSerial(dest).route = src
					this.setVariable('serial_' + (dest+1) + '_route', this.getSerial(src).name);
					break;
			}
		}
	},

	/**
	 * INTERNAL: Updates serial port directions based on data from the Videohub
	 *
	 * @param {string} labeltype - the command/data type being passed
	 * @param {Object} object - the collected data
	 * @access protected
	 * @since 1.1.0
	 */
	updateSerialDirections(labeltype, object) {

		for (var key in object) {
			var parsethis = object[key];
			var a = parsethis.split(/ /);
			var num = parseInt(a.shift());
			var type = a.join(" ");

			switch (labeltype) {
				case 'SERIAL PORT DIRECTIONS':
					this.getSerial(num).direction = type;
					break;
			}
		}
	},

	/**
	 * INTERNAL: Updates variables based on data from the Videohub
	 *
	 * @param {string} labeltype - the command/data type being passed
	 * @param {Object} object - the collected data
	 * @access protected
	 * @since 1.1.0
	 */
	updateStatus(labeltype, object) {

		for (var key in object) {
			var parsethis = object[key];
			var a = parsethis.split(/ /);
			var num = parseInt(a.shift());
			var label = a.join(" ");

			switch (labeltype) {
				case 'VIDEO INPUT STATUS':
					this.getInput(num).status = label;
					break;
				case 'VIDEO OUTPUT STATUS':
					this.getOutput(num).status = label;
					break;
				case 'SERIAL PORT STATUS':
					this.getSerial(num).status = label;
					break;
			}
		}
	}
}