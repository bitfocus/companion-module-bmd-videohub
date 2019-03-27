var tcp = require('../../tcp');
var instance_skel = require('../../instance_skel');
var debug;
var log;

/**
 * Companion instance class for the Blackmagic VideoHub Routers.
 *
 * @extends instance_skel
 * @version 1.1.0
 * @since 1.0.0
 * @author William Viker <william@bitfocus.io>
 * @author Keith Rocheck <keith.rocheck@gmail.com>
 */
class instance extends instance_skel {

	/**
	 * Create an instance of a videohub module.
	 *
	 * @param {EventEmitter} system - the brains of the operation
	 * @param {string} id - the instance ID
	 * @param {Object} config - saved user configuration parameters
	 * @since 1.0.0
	 */
	constructor(system, id, config) {
		super(system, id, config);

		this.stash      = [];
		this.command    = null;
		this.selected   = 0;
		this.deviceName = '';

		this.inputCount      = parseInt(this.config.inputCount);
		this.outputCount     = parseInt(this.config.outputCount);
		this.monitoringCount = parseInt(this.config.monitoringCount);
		this.serialCount     = parseInt(this.config.serialCount);

		this.inputs  = {};
		this.outputs = {};
		this.serials = {};

		this.CHOICES_INPUTS  = [];
		this.CHOICES_OUTPUTS = [];
		this.CHOICES_SERIALS = [];

		this.CHOICES_SERIALDIRECTIONS = [
			{ id: 'auto',    label: 'Automatic'        },
			{ id: 'control', label: 'In (Workstation)' },
			{ id: 'slave',   label: 'Out (Deck)'       }
		];

		this.actions(); // export actions
	}

	/**
	 * Setup the actions.
	 *
	 * @param {EventEmitter} system - the brains of the operation
	 * @access public
	 * @since 1.0.0
	 */
	actions(system) {
		var actions = {};

		this.setupChoices();

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
				},
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
					},
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

		this.setActions(actions);
	}

	/**
	 * Executes the provided action.
	 *
	 * @param {Object} action - the action to be executed
	 * @access public
	 * @since 1.0.0
	 */
	action(action) {
		var cmd;
		var opt = action.options;

		switch (action.action) {
			case 'route':
				if (parseInt(opt.destination) >= this.outputCount)
				{
					cmd = "VIDEO MONITORING OUTPUT ROUTING:\n"+(parseInt(opt.destination)-this.outputCount)+" "+opt.source+"\n\n";
				}
				else
				{
					cmd = "VIDEO OUTPUT ROUTING:\n"+opt.destination+" "+opt.source+"\n\n";
				}
				break;
			case 'route_serial':
				cmd = "SERIAL PORT ROUTING:\n"+opt.destination+" "+opt.source+"\n\n";
				break;
			case 'rename_source':
				cmd = "INPUT LABELS:\n"+opt.source+" "+opt.label+"\n\n";
				break;
			case 'rename_destination':
				if (parseInt(opt.destination) >= this.outputCount)
				{
					cmd = "MONITORING OUTPUT LABELS:\n"+(parseInt(opt.destination)-this.outputCount)+" "+opt.label+"\n\n";
				}
				else
				{
					cmd = "OUTPUT LABELS:\n"+opt.destination+" "+opt.label+"\n\n";
				}
				break;
			case 'rename_serial':
				cmd = "SERIAL PORT LABELS:\n"+opt.serial+" "+opt.label+"\n\n";
				break;
			case 'select_destination':
				this.selected = parseInt(opt.destination);
				this.checkFeedbacks('selected_destination');
				this.checkFeedbacks('selected_source');
				break;
			case 'route_source':
				if (this.selected >= this.outputCount)
				{
					cmd = "VIDEO MONITORING OUTPUT ROUTING:\n"+(this.selected-this.outputCount)+" "+opt.source+"\n\n";
				}
				else
				{
					cmd = "VIDEO OUTPUT ROUTING:\n"+this.selected+" "+opt.source+"\n\n";
				}
				break;
		}

		if (cmd !== undefined) {

			if (this.socket !== undefined && this.socket.connected) {
				this.socket.send(cmd);
			}
			else {
				debug('Socket not connected :(');
			}
		}
	}

	/**
	 * Creates the configuration fields for web config.
	 *
	 * @returns {Array} the config fields
	 * @access public
	 * @since 1.0.0
	 */
	config_fields() {

		return [
			{
				type: 'text',
				id: 'info',
				width: 12,
				label: 'Information',
				value: 'This module will connect to any Blackmagic Design VideoHub Device.'
			},
			{
				type: 'textinput',
				id: 'host',
				label: 'Videohub IP',
				width: 6,
				default: '192.168.10.150',
				regex: this.REGEX_IP
			},
			{
				type: 'text',
				id: 'info',
				width: 12,
				label: 'Information',
				value: 'This counts below will automatically populate from the device upon connection, however, can be set manually for offline programming.'
			},
			{
				type: 'textinput',
				id: 'inputCount',
				label: 'Input Count',
				default: '12',
				width: 2,
				regex: '/^\\d*$/'
			},
			{
				type: 'textinput',
				id: 'outputCount',
				label: 'Output Count',
				default: '12',
				width: 2,
				regex: '/^\\d*$/'
			},
			{
				type: 'textinput',
				id: 'monitoringCount',
				label: 'Monitoring Output Count (when present)',
				default: '0',
				width: 2,
				regex: '/^\\d*$/'
			},
			{
				type: 'textinput',
				id: 'serialCount',
				label: 'Serial Port Count (when present)',
				default: '0',
				width: 2,
				regex: '/^\\d*$/'
			}
		]
	}

	/**
	 * Clean up the instance before it is destroyed.
	 *
	 * @access public
	 * @since 1.0.0
	 */
	destroy() {
		if (this.socket !== undefined) {
			this.socket.destroy();
		}

		debug("destroy", this.id);
	}

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
	}

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
	}

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
	}

	/**
	 * Main initialization function called once the module
	 * is OK to start doing things.
	 *
	 * @access public
	 * @since 1.0.0
	 */
	init() {
		debug = this.debug;
		log = this.log;

		this.initVariables();
		this.initFeedbacks();

		this.init_tcp();
	}

	/**
	 * INTERNAL: use setup data to initalize the tcp socket object.
	 *
	 * @access protected
	 * @since 1.0.0
	 */
	init_tcp() {
		var receivebuffer = '';

		if (this.socket !== undefined) {
			this.socket.destroy();
			delete this.socket;
		}

		if (this.config.port === undefined) {
			this.config.port = 9990;
		}

		if (this.config.host) {
			this.socket = new tcp(this.config.host, this.config.port);

			this.socket.on('status_change', (status, message) => {
				this.status(status, message);
			});

			this.socket.on('error', (err) => {
				debug("Network error", err);
				this.log('error',"Network error: " + err.message);
			});

			this.socket.on('connect', () => {
				debug("Connected");
			});

			// separate buffered stream into lines with responses
			this.socket.on('data', (chunk) => {
				var i = 0, line = '', offset = 0;
				receivebuffer += chunk;

				while ( (i = receivebuffer.indexOf('\n', offset)) !== -1) {
					line = receivebuffer.substr(offset, i - offset);
					offset = i + 1;
					this.socket.emit('receiveline', line.toString());
				}

				receivebuffer = receivebuffer.substr(offset);
			});

			this.socket.on('receiveline', (line) => {

				if (this.command === null && line.match(/:/) ) {
					this.command = line;
				}
				else if (this.command !== null && line.length > 0) {
					this.stash.push(line.trim());
				}
				else if (line.length === 0 && this.command !== null) {
					var cmd = this.command.trim().split(/:/)[0];

					this.processVideohubInformation(cmd, this.stash);

					this.stash = [];
					this.command = null;
				}
				else {
					debug("weird response from videohub", line, line.length);
				}
			});
		}
	}

	/**
	 * INTERNAL: initialize feedbacks.
	 *
	 * @access protected
	 * @since 1.1.0
	 */
	initFeedbacks() {
		// feedbacks
		var feedbacks = {};

		feedbacks['input_bg'] = {
			label: 'Change background color by destination',
			description: 'If the input specified is in use by the output specified, change background color of the bank',
			options: [
				{
					type: 'colorpicker',
					label: 'Foreground color',
					id: 'fg',
					default: this.rgb(0,0,0)
				},
				{
					type: 'colorpicker',
					label: 'Background color',
					id: 'bg',
					default: this.rgb(255,255,0)
				},
				{
					type: 'dropdown',
					label: 'Input',
					id: 'input',
					default: '0',
					choices: this.CHOICES_INPUTS
				},
				{
					type: 'dropdown',
					label: 'Output',
					id: 'output',
					default: '0',
					choices: this.CHOICES_OUTPUTS
				}
			],
			callback: (feedback, bank) => {
				if (this.getOutput(parseInt(feedback.options.output)).route == parseInt(feedback.options.input)) {
					return {
						color: feedback.options.fg,
						bgcolor: feedback.options.bg
					};
				}
			}
		};

		feedbacks['selected_destination'] = {
			label: 'Change background color by selected destination',
			description: 'If the input specified is in use by the selected output specified, change background color of the bank',
			options: [
				{
					type: 'colorpicker',
					label: 'Foreground color',
					id: 'fg',
					default: this.rgb(0,0,0)
				},
				{
					type: 'colorpicker',
					label: 'Background color',
					id: 'bg',
					default: this.rgb(255,255,0)
				},
				{
					type: 'dropdown',
					label: 'Output',
					id: 'output',
					default: '0',
					choices: this.CHOICES_OUTPUTS
				}
			],
			callback: (feedback, bank) => {
				if (parseInt(feedback.options.output) == this.selected) {
					return {
						color: feedback.options.fg,
						bgcolor: feedback.options.bg
					};
				}
			}
		};

		feedbacks['selected_source'] = {
			label: 'Change background color by route to selected destination',
			description: 'If the input specified is in use by the selected output specified, change background color of the bank',
			options: [
				{
					type: 'colorpicker',
					label: 'Foreground color',
					id: 'fg',
					default: this.rgb(0,0,0)
				},
				{
					type: 'colorpicker',
					label: 'Background color',
					id: 'bg',
					default: this.rgb(255,255,255)
				},
				{
					type: 'dropdown',
					label: 'Input',
					id: 'input',
					default: '0',
					choices: this.CHOICES_INPUTS
				}
			],
			callback: (feedback, bank) => {
				if (this.getOutput(this.selected).route == parseInt(feedback.options.input)) {
					return {
						color: feedback.options.fg,
						bgcolor: feedback.options.bg
					};
				}
			}
		};

		this.setFeedbackDefinitions(feedbacks);
	}

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

	/**
	 * INTERNAL: Routes incoming data to the appropriate function for processing.
	 *
	 * @param {string} key - the command/data type being passed
	 * @param {Object} data - the collected data
	 * @access protected
	 * @since 1.0.0
	 */
	processVideohubInformation(key,data) {

		if (key.match(/(INPUT|OUTPUT|MONITORING OUTPUT|SERIAL PORT) LABELS/)) {
			this.updateLabels(key,data);
			this.actions();
			this.initFeedbacks();
		}
		else if (key.match(/(VIDEO OUTPUT|VIDEO MONITORING OUTPUT|SERIAL PORT) ROUTING/)) {
			this.updateRouting(key,data);

			this.checkFeedbacks('input_bg');
			this.checkFeedbacks('selected_source');
		}
		else if (key.match(/(VIDEO OUTPUT|VIDEO MONITORING OUTPUT|SERIAL PORT) LOCKS/)) {
			this.updateLocks(key,data);
		}
		else if (key.match(/(VIDEO INPUT|VIDEO OUTPUT|SERIAL PORT) STATUS/)) {
			this.updateStatus(key,data);
			this.actions();
			this.initFeedbacks();
		}
		else if (key == 'SERIAL PORT DIRECTIONS') {
			this.updateSerialDirections(key,data);
		}
		else if (key == 'VIDEOHUB DEVICE') {
			this.updateDevice(key,data);
			this.actions();
			this.initVariables();
			this.initFeedbacks();
		}
		else {
			// TODO: find out more about the video hub from stuff that comes in here
		}
	}

	/**
	 * INTERNAL: use model data to define the choices for the dropdowns.
	 *
	 * @access protected
	 * @since 1.1.0
	 */
	setupChoices() {

		this.CHOICES_INPUTS  = [];
		this.CHOICES_OUTPUTS = [];
		this.CHOICES_SERIALS = [];

		if (this.inputCount > 0) {
			for(var key = 0; key < this.inputCount; key++) {
				if (this.getInput(key).status != 'None') {
					this.CHOICES_INPUTS.push( { id: key, label: this.getInput(key).label } );
				}
			}
		}

		if (this.outputCount > 0) {
			for(var key = 0; key < (this.outputCount + this.monitoringCount); key++) {
				if (this.getOutput(key).status != 'None') {
					this.CHOICES_OUTPUTS.push( { id: key, label: this.getOutput(key).label } );
				}
			}
		}

		if (this.serialCount > 0) {
			for(var key = 0; key < this.serialCount; key++) {
				if (this.getSerial(key).status != 'None') {
					this.CHOICES_SERIALS.push( { id: key, label: this.getSerial(key).label } );
				}
			}
		}
	}

	/**
	 * Process an updated configuration array.
	 *
	 * @param {Object} config - the new configuration
	 * @access public
	 * @since 1.0.0
	 */
	updateConfig(config) {
		var resetConnection = false;
		
		if (this.config.host != config.host)
		{
			resetConnection = true;
		}

		this.config = config;

		this.inputCount      = parseInt(this.config.inputCount);
		this.outputCount     = parseInt(this.config.outputCount);
		this.monitoringCount = parseInt(this.config.monitoringCount);
		this.serialCount     = parseInt(this.config.serialCount);

		if (resetConnection === true || this.socket === undefined) {
			this.init_tcp();
		}
	}

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
	}

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
	}

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
	}

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
	}

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
	}

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

exports = module.exports = instance;