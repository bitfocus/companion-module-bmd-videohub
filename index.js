var tcp = require('../../tcp');
var instance_skel = require('../../instance_skel');
var fs = require('fs');

var instance_api  = require('./internalAPI');
var actions       = require('./actions');
var feedback      = require('./feedback');
var presets       = require('./presets');
var variables     = require('./variables');

var debug;
var log;

/**
 * Companion instance class for the Blackmagic VideoHub Routers.
 * 
 * !!! This class is being used by the bmd-multiview16 module, be careful !!!
 *
 * @extends instance_skel
 * @version 1.3.0
 * @since 1.0.0
 * @author William Viker <william@bitfocus.io>
 * @author Keith Rocheck <keith.rocheck@gmail.com>
 * @author Peter Schuster
 * @author Jim Amen <jim.amen50@gmail.com>
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

		this.stash        = [];
		this.command      = null;
		this.selected     = 0;
		this.deviceName   = '';
		this.queue        = '';
		this.queuedDest   = -1;
		this.queuedSource = -1;

		Object.assign(this, {
			...actions,
			...feedback,
			...presets,
			...variables,
			...instance_api
		});

		this.inputs  = {};
		this.outputs = {};
		this.serials = {};

		this.inputCount      = parseInt(config.inputCount);
		this.outputCount     = parseInt(config.outputCount);
		this.monitoringCount = parseInt(config.monitoringCount);
		this.serialCount     = parseInt(config.serialCount);

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

		this.setupChoices();
		this.setActions(this.getActions());
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
		var string = "";
		var routes_text = [];
		var data =[];
		var routes = [];
		var dest_source = [];

		switch (action.action) {

			case 'store_route_in_file':
				string = "  : BMD uses zero based indexing when referencing source and destination so '0' in this file references port '1'.  You may add your own text here after the colon. \n";
				string = string + "\nRouting history: \n"

				for (let index = 0; index < this.outputCount; index++) {
					data[index] = index  + ' ' + this.getOutput(index).route;
					string = string + index + "  " + this.getOutput(index).fallback + "\n"
				}
				try{
					fs.writeFileSync(opt.destination_file, data + string, 'utf8');
					this.log('info',data.length + " Routes written to: " + opt.destination_file );
				}
				catch (e) {
					this.log('error',"File Write Error: " + e.message);
				}
				break;

			case 'load_route_from_file':
				try {
					var data = fs.readFileSync(opt.source_file, 'utf8');
					try{
						routes_text= data.split(':');
						routes = routes_text[0].split(',');
						if((routes.length > 0) && (routes.length <= this.outputCount)) {      
						    cmd = '';
							for (let index = 0; index < routes.length; index++) {
								dest_source = routes[index].split(' ');
								if(isNaN(dest_source[0])) {
									throw routes[index] + " - " + dest_source[0] + " is not a valid Router Destination ";
								}
								if(dest_source[0] < 0 || dest_source[0] > (this.outputCount - 1)) {
									throw dest_source[0] + "  is an invalid destination.  Remember, Router is zero based when indexing ports.  Max Routes for this router = " + this.outputCount;
								}
								if(isNaN(dest_source[1])) {
									throw routes[index] + " - " + dest_source[1] + " is not a valid Router Source ";
								}
								if(dest_source[1] < 0 || dest_source[1] > (this.outputCount - 1)) {
									throw dest_source[1] + "  is an invalid source. Remember, Router is zero based when indexing ports.  Max Routes for this router = " +this.outputCount; 
								}
								cmd = cmd + "VIDEO OUTPUT ROUTING:\n" +  routes[index] + "\n\n"; 
							}
						}
						else {
							throw "Invalid number of Routes: " + routes.length + ",";
						}
						this.log('info', routes.length + " Routes read from File: " + opt.source_file );
					}
					catch (err) {
						this.log('error', err + " in File:" + opt.source_file);
					}
				}
				catch(e) {
					this.log('error',"File Read Error: " + e.message);
				}
				break;

			case 'route':
				var output = this.getOutput(parseInt(opt.destination));

				if (parseInt(opt.destination) >= this.outputCount) {
					cmd = "VIDEO MONITORING OUTPUT ROUTING:\n"+(parseInt(opt.destination)-this.outputCount)+" "+opt.source+"\n\n";
				}
				else {
					cmd = "VIDEO OUTPUT ROUTING:\n"+opt.destination+" "+opt.source+"\n\n";
				}
				break;

			case 'route_routed':
				if (parseInt(opt.destination) >= this.outputCount) {
					cmd = "VIDEO MONITORING OUTPUT ROUTING:\n"+(parseInt(opt.destination)-this.outputCount)+" "+opt.source+"\n\n";
				}
				else {
					cmd = "VIDEO OUTPUT ROUTING:\n"+opt.destination+" "+this.getOutput(parseInt(opt.source_routed_to_destination)).route+"\n\n";
				}
				break;

			case 'route_to_previous':
				var output = this.getOutput(parseInt(opt.destination));
				var fallbackpop = -1;

				fallbackpop = output.fallback.pop();  // The current route (i.e what the hardware is actually set to)
													  // has already been pushed onto the stack at "updateRouting" so to 
													  // get to the last route we have to first pop this one off.
				fallbackpop = output.fallback.pop();  // This now, is the route to fallback to.
					
				if(output.fallback.length < 1 ){
					output.fallback.push(-1);
				}

				if (fallbackpop >= 0) {

					if (parseInt(opt.destination) >= this.outputCount) {
						cmd = "VIDEO MONITORING OUTPUT ROUTING:\n"+(parseInt(opt.destination)-this.outputCount) + " " + fallbackpop + "\n\n";
					}
					else {
						cmd = "VIDEO OUTPUT ROUTING:\n"+opt.destination + " " + fallbackpop + "\n\n";
					}
				}
				break;

			case 'route_serial':
				cmd = "SERIAL PORT ROUTING:\n"+opt.destination+" "+opt.source+"\n\n";
				break;
			case 'rename_source':
				cmd = "INPUT LABELS:\n"+opt.source+" "+opt.label+"\n\n";
				break;
			case 'rename_destination':
				if (parseInt(opt.destination) >= this.outputCount) {
					cmd = "MONITORING OUTPUT LABELS:\n"+(parseInt(opt.destination)-this.outputCount)+" "+opt.label+"\n\n";
				}
				else {
					cmd = "OUTPUT LABELS:\n"+opt.destination+" "+opt.label+"\n\n";
				}
				break;
			case 'rename_serial':	
				cmd = "SERIAL PORT LABELS:\n"+opt.serial+" "+opt.label+"\n\n";
				break;
			case 'select_destination':
				this.selected = parseInt(opt.destination);
				this.checkFeedbacks('selected_destination');
				this.checkFeedbacks('take_tally_source');
				this.checkFeedbacks('selected_source');
				break;
			case 'route_source':
				if (this.selected >= this.outputCount) {
					if (this.config.take === true) {
						this.queue = "VIDEO MONITORING OUTPUT ROUTING:\n"+(this.selected-this.outputCount)+" "+opt.source+"\n\n";
						this.queuedDest = (this.selected-this.outputCount);
						this.queuedSource = parseInt(opt.source);
						this.checkFeedbacks('take');
						this.checkFeedbacks('take_tally_source');
						this.checkFeedbacks('take_tally_dest');
						this.checkFeedbacks('take_tally_route');
					}
					else {
						cmd = "VIDEO MONITORING OUTPUT ROUTING:\n"+(this.selected-this.outputCount)+" "+opt.source+"\n\n";
					}
				}
				else {
					if (this.config.take === true) {
						this.queue = "VIDEO OUTPUT ROUTING:\n"+this.selected+" "+opt.source+"\n\n";
						this.queuedDest = this.selected;
						this.queuedSource = parseInt(opt.source);
						this.checkFeedbacks('take');
						this.checkFeedbacks('take_tally_source');
						this.checkFeedbacks('take_tally_dest');
						this.checkFeedbacks('take_tally_route');
					}
					else {
						cmd = "VIDEO OUTPUT ROUTING:\n"+this.selected+" "+opt.source+"\n\n";
					}
				}
				break;
			case 'take':
				cmd = this.queue;
				this.queue = '';
				this.queuedDest = -1;
				this.queuedSource = -1;
				this.checkFeedbacks('take');
				this.checkFeedbacks('take_tally_source');
				this.checkFeedbacks('take_tally_dest');
				this.checkFeedbacks('take_tally_route');
				break;  
			case 'clear':
				this.queue = '';
				this.queuedDest = -1;
				this.queuedSource = -1;
				this.checkFeedbacks('take');
				this.checkFeedbacks('take_tally_source');
				this.checkFeedbacks('take_tally_dest');
				this.checkFeedbacks('take_tally_route');
				break;  
		}

		if (cmd !== undefined) {
			if (this.socket !== undefined && this.socket.connected) {
				try {
					this.socket.send(cmd);
				} catch (error) {
					this.log('error',"TCP error " + error.message);
				}
			}
			else {
				this.log('error',"Socket not connected ");   
				this.init_tcp();
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
				type: 'checkbox',
				id: 'take',
				label: 'Enable Take? (XY only)',
				width: 6,
				default: false,
			},
			{
				type: 'text',
				id: 'info',
				width: 12,
				label: 'Information',
				value: 'The counts below will automatically populate from the device upon connection, however, they can be set manually for offline programming.'
			},
			{
				type: 'number',
				id: 'inputCount',
				label: 'Input Count',
				default: 12,
				width: 3,
				min: 0,
				max: 288,
				required: true,
				range: false
			},
			{
				type: 'number',
				id: 'outputCount',
				label: 'Output Count',
				default: 12,
				width: 3,
				min: 0,
				max: 288,
				required: true,
				range: false
			},
			{
				type: 'number',
				id: 'monitoringCount',
				label: 'Monitoring Output Count (when present)',
				default: 0,
				width: 3,
				min: 0,
				max: 288,
				required: true,
				range: false
			},
			{
				type: 'number',
				id: 'serialCount',
				label: 'Serial Port Count (when present)',
				default: 0,
				width: 3,
				min: 0,
				max: 288,
				required: true,
				range: false
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

		this.debug("destroy", this.id);
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
		this.initPresets();
		this.checkFeedbacks('selected_destination');
		this.checkFeedbacks('selected_source');

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
				this.debug("Network error", err);
				this.log('error',"Network error: " + err.message);
			});

			this.socket.on('connect', () => {
				this.debug("Connected");
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
					this.debug("weird response from videohub", line, line.length);
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
		var feedbacks = this.getFeedbacks();

		this.setFeedbackDefinitions(feedbacks);
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
			this.initPresets();
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
			this.initPresets();
		}
		else if (key == 'SERIAL PORT DIRECTIONS') {
			this.updateSerialDirections(key,data);
		}
		else if (key == 'VIDEOHUB DEVICE') {
			this.updateDevice(key,data);
			this.actions();
			this.initVariables();
			this.initFeedbacks();
			this.initPresets();
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

		this.actions();
		this.initFeedbacks();
		this.initPresets();
		this.initVariables();

		if (resetConnection === true || this.socket === undefined) {
			this.init_tcp();
		}
	}
}

exports = module.exports = instance;
