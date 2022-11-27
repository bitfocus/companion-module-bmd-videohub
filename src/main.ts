import { InstanceBase, runEntrypoint, TCPHelper } from '@companion-module/base'
import { getConfigFields, VideoHubConfig } from './config.js'
import { initVariables } from './variables.js'
import { getPresets } from './presets.js'
import { getActions } from './actions.js'
import { getFeedbacks } from './feedback.js'
import { updateDevice, updateLabels, updateRouting, updateStatus } from './internalAPI.js'
import { VideohubState } from './state.js'
import { UpgradeScripts } from './upgrades.js'

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
class VideohubInstance extends InstanceBase<VideoHubConfig> {
	readonly state: VideohubState

	socket: TCPHelper | undefined
	config: VideoHubConfig

	constructor(internal: unknown) {
		super(internal)

		this.state = new VideohubState()

		this.config = {}
	}

	/**
	 * Creates the configuration fields for web config.
	 */
	getConfigFields() {
		return getConfigFields()
	}

	/**
	 * Clean up the instance before it is destroyed.
	 *
	 * @access public
	 * @since 1.0.0
	 */
	async destroy() {
		if (this.socket !== undefined) {
			this.socket.destroy()
		}
	}

	/**
	 * Main initialization function called once the module
	 * is OK to start doing things.
	 */
	async init(config: VideoHubConfig) {
		this.config = config

		this.state.updateCounts(config)

		this.initThings(true)
		this.checkFeedbacks()

		this.init_tcp()
	}

	initThings(includeVariables: boolean) {
		if (includeVariables) {
			initVariables(this, this.state)
		}

		this.setActionDefinitions(getActions(this, this.state))
		this.setFeedbackDefinitions(getFeedbacks(this.state))
		this.setPresetDefinitions(getPresets(this.state))
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
					this.#handleReceivedLine(line)
				}

				receivebuffer = receivebuffer.substring(discardOffset)
			})
		}
	}

	command: string | null = null
	stash: string[] = []

	#handleReceivedLine(line: string) {
		try {
			if (this.command === null && line.match(/:/)) {
				this.command = line
			} else if (this.command !== null && line.length > 0) {
				this.stash.push(line.trim())
			} else if (line.length === 0 && this.command !== null) {
				const cmd = this.command.trim().split(/:/)[0]

				this.#processVideohubInformation(cmd, this.stash)

				this.stash = []
				this.command = null
			} else {
				this.log('debug', `weird response from videohub (${line.length} bytes): ${line}`)
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
	#processVideohubInformation(key: string, data: string[]) {
		if (key.match(/(INPUT|OUTPUT|MONITORING OUTPUT|SERIAL PORT) LABELS/)) {
			updateLabels(this, this.state, key, data)
			this.initThings(false)
		} else if (key.match(/(VIDEO OUTPUT|VIDEO MONITORING OUTPUT|SERIAL PORT) ROUTING/)) {
			updateRouting(this, this.state, key, data)
			// } else if (key.match(/(VIDEO OUTPUT|VIDEO MONITORING OUTPUT|SERIAL PORT) LOCKS/)) {
			// 	updateLocks(this, key, data)
		} else if (key.match(/(VIDEO INPUT|VIDEO OUTPUT|SERIAL PORT) STATUS/)) {
			updateStatus(this, this.state, key, data)
			this.initThings(false)
			// } else if (key == 'SERIAL PORT DIRECTIONS') {
			// 	updateSerialDirections(this, key, data)
		} else if (key == 'VIDEOHUB DEVICE') {
			updateDevice(this, key, data)
			this.initThings(true)
		} else {
			// TODO: find out more about the video hub from stuff that comes in here
		}
	}

	/**
	 * Process an updated configuration array.
	 *
	 * @param {Object} config - the new configuration
	 * @access public
	 */
	async configUpdated(config: VideoHubConfig) {
		let resetConnection = false

		if (this.config.host != config.host) {
			resetConnection = true
		}

		this.config = config

		this.state.updateCounts(config)

		this.initThings(true)

		if (resetConnection === true || this.socket === undefined) {
			this.init_tcp()
		}
	}
}

runEntrypoint(VideohubInstance, UpgradeScripts)
