import { InstanceBase, runEntrypoint, TCPHelper } from '@companion-module/base'
import { getConfigFields } from './config.js'
import { initVariables } from './variables.js'
import { initPresets } from './presets.js'
import { getActions } from './actions.js'
import { getFeedbacks } from './feedback.js'
import * as instance_api from './internalAPI.js'

/**
 * Companion instance class for the Blackmagic VideoHub Routers.
 *
 * !!! This class is being used by the bmd-multiview16 module, be careful !!!
 *
 * @extends InstanceBase
 * @author William Viker <william@bitfocus.io>
 * @author Keith Rocheck <keith.rocheck@gmail.com>
 * @author Peter Schuster
 * @author Jim Amen <jim.amen50@gmail.com>
 */
class VideohubInstance extends InstanceBase {
	/**
	 * Create an instance of a videohub module.
	 *
	 * @param {EventEmitter} system - the brains of the operation
	 * @param {string} id - the instance ID
	 * @param {Object} config - saved user configuration parameters
	 * @since 1.0.0
	 */
	constructor(system, id, config) {
		super(system, id, config)

		this.stash = []
		this.command = null
		this.selected = 0
		this.deviceName = ''
		this.queue = ''
		this.queuedDest = -1
		this.queuedSource = -1

		Object.assign(this, instance_api)

		this.getActions = getActions
		this.getFeedbacks = getFeedbacks
		this.initPresets = initPresets

		this.inputs = {}
		this.outputs = {}
		this.serials = {}

		this.CHOICES_INPUTS = []
		this.CHOICES_OUTPUTS = []
		this.CHOICES_SERIALS = []

		this.CHOICES_SERIALDIRECTIONS = [
			{ id: 'auto', label: 'Automatic' },
			{ id: 'control', label: 'In (Workstation)' },
			{ id: 'slave', label: 'Out (Deck)' },
		]
	}

	/**
	 * Creates the configuration fields for web config.
	 *
	 * @returns {Array} the config fields
	 * @access public
	 * @since 1.0.0
	 */
	getConfigFields() {
		return getConfigFields(this)
	}

	/**
	 * Clean up the instance before it is destroyed.
	 *
	 * @access public
	 * @since 1.0.0
	 */
	destroy() {
		if (this.socket !== undefined) {
			this.socket.destroy()
		}
	}

	/**
	 * Main initialization function called once the module
	 * is OK to start doing things.
	 *
	 * @access public
	 * @since 1.0.0
	 */
	init(config) {
		this.config = config

		this.inputCount = parseInt(config.inputCount)
		this.outputCount = parseInt(config.outputCount)
		this.monitoringCount = parseInt(config.monitoringCount)
		this.serialCount = parseInt(config.serialCount)

		initVariables(this)
		this.initThings()
		this.checkFeedbacks('selected_destination', 'selected_source')

		this.init_tcp()
	}

	initThings() {
		this.setupChoices()
		this.setActionDefinitions(this.getActions())

		this.setFeedbackDefinitions(this.getFeedbacks())

		this.initPresets()
	}

	/**
	 * INTERNAL: use setup data to initalize the tcp socket object.
	 *
	 * @access protected
	 * @since 1.0.0
	 */
	init_tcp() {
		if (this.socket) {
			this.socket.destroy()
			delete this.socket
		}

		if (this.config.port === undefined) {
			this.config.port = 9990
		}

		if (this.config.host) {
			this.socket = new TCPHelper(this.config.host, this.config.port)

			this.socket.on('status_change', (status, message) => {
				this.updateStatus(status, message)
			})

			this.socket.on('error', (err) => {
				this.log('error', 'Network error: ' + err.message)
			})

			this.socket.on('connect', () => {
				this.log('debug', 'Connected')
			})

			// separate buffered stream into lines with responses
			let receivebuffer = ''
			this.socket.on('data', (chunk) => {
				receivebuffer += chunk.toString()

				let lineEnd = -1
				let discardOffset = 0

				while ((lineEnd = receivebuffer.indexOf('\n', discardOffset)) !== -1) {
					const line = receivebuffer.substring(discardOffset, lineEnd)
					discardOffset = lineEnd + 1
					this.handleReceivedLine(line)
				}

				receivebuffer = receivebuffer.substring(discardOffset)
			})
		}
	}

	handleReceivedLine(line) {
		try {
			if (this.command === null && line.match(/:/)) {
				this.command = line
			} else if (this.command !== null && line.length > 0) {
				this.stash.push(line.trim())
			} else if (line.length === 0 && this.command !== null) {
				const cmd = this.command.trim().split(/:/)[0]

				this.processVideohubInformation(cmd, this.stash)

				this.stash = []
				this.command = null
			} else {
				this.debug('weird response from videohub', line, line.length)
			}
		} catch (e) {
			this.log('error', `Handle command failed: ${e}`)
		}
	}

	/**
	 * INTERNAL: Routes incoming data to the appropriate function for processing.
	 *
	 * @param {string} key - the command/data type being passed
	 * @param {Object} data - the collected data
	 * @access protected
	 * @since 1.0.0
	 */
	processVideohubInformation(key, data) {
		if (key.match(/(INPUT|OUTPUT|MONITORING OUTPUT|SERIAL PORT) LABELS/)) {
			this.updateLabels(key, data)
			this.initThings()
		} else if (key.match(/(VIDEO OUTPUT|VIDEO MONITORING OUTPUT|SERIAL PORT) ROUTING/)) {
			this.updateRouting(key, data)
			this.checkFeedbacks('input_bg', 'selected_source')
		} else if (key.match(/(VIDEO OUTPUT|VIDEO MONITORING OUTPUT|SERIAL PORT) LOCKS/)) {
			this.updateLocks(key, data)
		} else if (key.match(/(VIDEO INPUT|VIDEO OUTPUT|SERIAL PORT) STATUS/)) {
			this.updateStatus(key, data)
			this.initThings()
		} else if (key == 'SERIAL PORT DIRECTIONS') {
			this.updateSerialDirections(key, data)
		} else if (key == 'VIDEOHUB DEVICE') {
			this.updateDevice(key, data)
			this.initVariables()
			this.initThings()
		} else {
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
		this.CHOICES_INPUTS = []
		this.CHOICES_OUTPUTS = []
		this.CHOICES_SERIALS = []

		if (this.inputCount > 0) {
			for (let key = 0; key < this.inputCount; key++) {
				if (this.getInput(key).status != 'None') {
					this.CHOICES_INPUTS.push({ id: key, label: this.getInput(key).label })
				}
			}
		}

		if (this.outputCount > 0) {
			for (let key = 0; key < this.outputCount + this.monitoringCount; key++) {
				if (this.getOutput(key).status != 'None') {
					this.CHOICES_OUTPUTS.push({ id: key, label: this.getOutput(key).label })
				}
			}
		}

		if (this.serialCount > 0) {
			for (let key = 0; key < this.serialCount; key++) {
				if (this.getSerial(key).status != 'None') {
					this.CHOICES_SERIALS.push({ id: key, label: this.getSerial(key).label })
				}
			}
		}
	}

	/**
	 * Process an updated configuration array.
	 *
	 * @param {Object} config - the new configuration
	 * @access public
	 */
	configUpdated(config) {
		let resetConnection = false

		if (this.config.host != config.host) {
			resetConnection = true
		}

		this.config = config

		this.inputCount = parseInt(this.config.inputCount)
		this.outputCount = parseInt(this.config.outputCount)
		this.monitoringCount = parseInt(this.config.monitoringCount)
		this.serialCount = parseInt(this.config.serialCount)

		this.initThings()
		this.initVariables()

		if (resetConnection === true || this.socket === undefined) {
			this.init_tcp()
		}
	}
}

runEntrypoint(VideohubInstance, [])
