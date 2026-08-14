import { InstanceBase, InstanceStatus, TCPHelper } from '@companion-module/base'
import { DEFAULT_PORT, getConfigFields, VideoHubConfig } from './config.js'
import { initVariables } from './variables.js'
import { getPresets } from './presets.js'
import { getActions } from './actions.js'
import { getFeedbacks } from './feedback.js'
import { updateDevice, updateLabels, updateRouting, updateStatus, updateLocks, VideohubApi } from './internalAPI.js'
import { VideohubState } from './state.js'
import { UpgradeScripts } from './upgrades.js'
import type { InstanceBaseExt, IpAndPort, VideohubTypes } from './types.js'

export { UpgradeScripts }

/**
 * Companion instance class for the Blackmagic VideoHub Routers.
 *
 * @extends InstanceBase
 * @author Julian Waller <julian@bitfocus.io>
 * @author William Viker <william@bitfocus.io>
 * @author Keith Rocheck <keith.rocheck@gmail.com>
 * @author Peter Schuster
 * @author Jim Amen <jim.amen50@gmail.com>
 */
export default class VideohubInstance extends InstanceBase<VideohubTypes> implements InstanceBaseExt {
	readonly state: VideohubState

	/**
	 * Owns the command queue, so it must outlive initThings() - which runs on every label and
	 * status update, including the ones the device sends in response to our own commands.
	 */
	readonly api: VideohubApi

	socket: TCPHelper | undefined
	pingTimer: NodeJS.Timeout | undefined
	lastDataReceivedAt = 0
	config: VideoHubConfig

	constructor(internal: unknown) {
		super(internal)

		this.state = new VideohubState()
		this.api = new VideohubApi(this)

		this.config = {}

		this.instanceOptions.disableNewConfigLayout = true
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
		this.api.flush('Instance destroyed')

		if (this.socket !== undefined) {
			this.socket.destroy()
			delete this.socket
		}

		if (this.pingTimer) {
			clearInterval(this.pingTimer)
			delete this.pingTimer
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
		this.checkAllFeedbacks()

		this.init_tcp()
	}

	initThings(includeVariables: boolean) {
		if (includeVariables) {
			initVariables(this, this.state)
		}

		this.setActionDefinitions(getActions(this, this.api, this.state))
		this.setFeedbackDefinitions(getFeedbacks(this, this.state))
		this.setPresetDefinitions(...getPresets(this.state))
	}

	/**
	 * INTERNAL: use setup data to initalize the tcp socket object.
	 *
	 * @access protected
	 * @since 1.0.0
	 */
	init_tcp() {
		this.lastDataReceivedAt = Date.now()

		// Nothing queued against the old socket can still be acknowledged.
		this.api.flush('Connection was reset')

		if (this.socket) {
			this.socket.destroy()
			delete this.socket
		}

		if (this.pingTimer) {
			clearInterval(this.pingTimer)
			delete this.pingTimer
		}

		const target = this.parseIpAndPort()
		if (target) {
			this.updateStatus(InstanceStatus.Connecting)

			this.socket = new TCPHelper(target.ip, target.port || DEFAULT_PORT)

			this.socket.on('status_change', (status, message) => {
				this.updateStatus(status, message)
			})

			this.socket.on('error', (err) => {
				this.log('error', 'Network error: ' + err.message)
				this.api.flush('Network error: ' + err.message)
			})

			this.socket.on('end', () => {
				this.log('debug', 'Connection closed')
				this.api.flush('Connection closed')
			})

			this.socket.on('connect', () => {
				this.lastDataReceivedAt = Date.now()
				this.log('debug', 'Connected')
			})

			// separate buffered stream into lines with responses
			let receivebuffer = ''
			this.socket.on('data', (chunk) => {
				this.lastDataReceivedAt = Date.now()
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

			const pingInterval = 15000
			this.pingTimer = setInterval(() => {
				if (!this.socket) return

				if (Date.now() - this.lastDataReceivedAt > pingInterval * 2) {
					this.log('warn', 'No data received from device in 30s, reconnecting')
					this.init_tcp()
					return
				}

				if (this.socket.isConnected) {
					// Rejections are already logged by the queue, and a failed ping triggers its own
					// reconnect, so nothing more to do here than keep the rejection handled.
					this.api.ping().catch(() => null)
				}
			}, pingInterval)
		} else {
			this.updateStatus(InstanceStatus.Disconnected)
		}
	}

	command: string | null = null
	stash: string[] = []

	#handleReceivedLine(line: string) {
		try {
			if ((this.command === null && line.match(/:/)) || line === 'ACK' || line === 'NAK') {
				this.command = line
			} else if (this.command !== null && line.length > 0) {
				this.stash.push(line.trim())
			} else if (line.length === 0 && this.command !== null) {
				const cmd = this.command.trim().split(/:/)[0]

				// ACK and NAK arrive as blocks with no body, so they settle the in-flight command at
				// block termination like any other block.
				if (cmd === 'ACK') {
					this.api.handleAck()
				} else if (cmd === 'NAK') {
					this.api.handleNak()
				} else {
					this.#processVideohubInformation(cmd, this.stash)
				}

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
		} else if (key.match(/(VIDEO OUTPUT|VIDEO MONITORING OUTPUT|SERIAL PORT) LOCKS/)) {
			updateLocks(this, key, data)
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

		if (
			this.config.host != config.host ||
			this.config.port != config.port ||
			this.config.bonjourHost != config.bonjourHost
		) {
			resetConnection = true
		}

		this.config = config

		this.state.updateCounts(config)

		this.initThings(true)

		if (resetConnection === true || this.socket === undefined) {
			this.init_tcp()
		}
	}

	parseIpAndPort(): IpAndPort | null {
		const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/

		if (this.config.bonjourHost) {
			const [ip, rawPort] = this.config.bonjourHost.split(':')
			const port = Number(rawPort)
			if (ip.match(ipRegex) && !isNaN(port)) {
				return {
					ip,
					port,
				}
			}
		} else if (this.config.host) {
			if (this.config.host.match(ipRegex)) {
				return {
					ip: this.config.host,
					port: this.config.port,
				}
			}
		}
		return null
	}
}
