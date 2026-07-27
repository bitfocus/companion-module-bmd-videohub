import type { LogLevel } from '@companion-module/base'

/**
 * How long to wait for the Videohub to acknowledge a command before treating the
 * connection as untrustworthy.
 *
 * The protocol acknowledges every recognized command, so a missing ACK is not slowness -
 * it means the device is wedged or data has been lost. This sits well inside the 5s action
 * timeout used by callers, so a wedged device surfaces as a module error rather than an
 * opaque timeout further up the stack.
 */
export const ACK_TIMEOUT_MS = 2000

/** The parts of the module instance the queue needs, kept narrow so it can be tested alone. */
export interface CommandQueueHost {
	/** Write a raw command block to the device. */
	send(cmd: string): void
	/** Whether the socket is ready to accept writes. */
	isConnected(): boolean
	log(level: LogLevel, message: string): void
	/** Called when the ACK stream can no longer be accounted for. The host must reconnect. */
	reconnect(): void
}

interface PendingCommand {
	cmd: string
	resolve: () => void
	reject: (error: Error) => void
}

/**
 * Serializes commands to the Videohub, keeping exactly one unacknowledged block on the wire.
 *
 * The Videohub silently discards commands when too many arrive at once - it applies the
 * start of a burst and drops the rest, with no NAK and no socket error. Gating each send on
 * the previous command's acknowledgement makes the device's own ACK rate set our send rate,
 * so the safe burst size is discovered at runtime instead of guessed.
 *
 * Resolving means the device *accepted* the command, never that it applied it. Per the
 * protocol manual a client "should never rely on the desired update actually occurring" and
 * must take the status updates the device sends afterwards as the source of truth.
 */
export class CommandQueue {
	readonly #host: CommandQueueHost

	#queue: PendingCommand[] = []
	#inFlight: PendingCommand | undefined
	#timer: NodeJS.Timeout | undefined

	constructor(host: CommandQueueHost) {
		this.#host = host
	}

	/** Number of commands sent-but-unacknowledged plus waiting. Intended for tests and diagnostics. */
	get depth(): number {
		return this.#queue.length + (this.#inFlight ? 1 : 0)
	}

	/**
	 * Queue a command block. The returned promise settles when the device acknowledges it,
	 * rejects it with a NAK, or the connection is torn down.
	 */
	enqueue(cmd: string): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			this.#queue.push({ cmd, resolve, reject })
			this.#pump()
		})
	}

	/** The device accepted the in-flight command. */
	handleAck(): void {
		this.#settle(undefined)
	}

	/** The device did not understand the in-flight command. */
	handleNak(): void {
		this.#settle(new Error('Videohub did not understand the command (NAK)'))
	}

	/** Reject everything pending. Used on disconnect, on timeout, and when the instance is destroyed. */
	flush(reason: string): void {
		this.#clearTimer()

		const pending = this.#inFlight ? [this.#inFlight, ...this.#queue] : this.#queue
		this.#inFlight = undefined
		this.#queue = []

		for (const command of pending) {
			command.reject(new Error(reason))
		}
	}

	#settle(error: Error | undefined): void {
		const command = this.#inFlight
		if (!command) {
			// An acknowledgement with nothing in flight - a late reply to a command that already
			// timed out, or one that raced a flush. Attributing it to a later command would put
			// every subsequent command permanently off by one, so drop it.
			this.#host.log('debug', 'Ignoring acknowledgement with no command in flight')
			return
		}

		this.#clearTimer()
		this.#inFlight = undefined

		if (error) {
			this.#host.log('error', `${error.message}: ${JSON.stringify(command.cmd)}`)
			command.reject(error)
		} else {
			command.resolve()
		}

		this.#pump()
	}

	#pump(): void {
		if (this.#inFlight || this.#queue.length === 0) return

		if (!this.#host.isConnected()) {
			this.flush('Socket not connected')
			this.#host.reconnect()
			return
		}

		const next = this.#queue.shift()
		if (!next) return

		this.#inFlight = next

		try {
			this.#host.send(next.cmd)
		} catch (error: any) {
			this.#inFlight = undefined
			this.#host.log('error', 'TCP error ' + error.message)
			next.reject(error instanceof Error ? error : new Error(String(error)))
			this.#pump()
			return
		}

		this.#timer = setTimeout(() => this.#handleTimeout(), ACK_TIMEOUT_MS)
	}

	#handleTimeout(): void {
		this.#timer = undefined

		// Every recognised command is acknowledged, so silence means the stream can no longer be
		// accounted for. Reconnecting also re-syncs local state from the device's status dump.
		this.#host.log('error', `No acknowledgement from Videohub within ${ACK_TIMEOUT_MS}ms, reconnecting`)
		this.flush('Timed out waiting for acknowledgement from Videohub')
		this.#host.reconnect()
	}

	#clearTimer(): void {
		if (this.#timer !== undefined) {
			clearTimeout(this.#timer)
			this.#timer = undefined
		}
	}
}
