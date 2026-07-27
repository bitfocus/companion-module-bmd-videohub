import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ACK_TIMEOUT_MS, CommandQueue, type CommandQueueHost } from './commandQueue.js'

const createHost = () => {
	const sent: string[] = []
	let connected = true

	const host: CommandQueueHost & { sent: string[]; reconnect: ReturnType<typeof vi.fn> } = {
		sent,
		send: (cmd) => {
			sent.push(cmd)
		},
		isConnected: () => connected,
		log: () => undefined,
		reconnect: vi.fn(),
	}

	return {
		host,
		sent,
		disconnect: () => {
			connected = false
		},
	}
}

/** Promise rejections are expected throughout; keep them handled so the run stays clean. */
const settled = (promise: Promise<void>) => promise.then(() => 'resolved' as const).catch(() => 'rejected' as const)

describe('CommandQueue', () => {
	beforeEach(() => {
		vi.useFakeTimers()
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	it('sends the first command immediately', async () => {
		const { host, sent } = createHost()
		const queue = new CommandQueue(host)

		void settled(queue.enqueue('PING:\n\n'))

		expect(sent).toEqual(['PING:\n\n'])
	})

	it('holds every later command until the one in flight is acknowledged', async () => {
		const { host, sent } = createHost()
		const queue = new CommandQueue(host)

		const results = [settled(queue.enqueue('A')), settled(queue.enqueue('B')), settled(queue.enqueue('C'))]

		// This is the bug: without gating, all three would already be on the wire.
		expect(sent).toEqual(['A'])

		queue.handleAck()
		expect(sent).toEqual(['A', 'B'])

		queue.handleAck()
		expect(sent).toEqual(['A', 'B', 'C'])

		queue.handleAck()
		await expect(Promise.all(results)).resolves.toEqual(['resolved', 'resolved', 'resolved'])
		expect(queue.depth).toBe(0)
	})

	it('rejects on NAK and carries on with the next command', async () => {
		const { host, sent } = createHost()
		const queue = new CommandQueue(host)

		const first = settled(queue.enqueue('A'))
		const second = settled(queue.enqueue('B'))

		queue.handleNak()

		await expect(first).resolves.toBe('rejected')
		expect(sent).toEqual(['A', 'B'])

		queue.handleAck()
		await expect(second).resolves.toBe('resolved')
		expect(host.reconnect).not.toHaveBeenCalled()
	})

	it('rejects everything and reconnects when an acknowledgement never arrives', async () => {
		const { host } = createHost()
		const queue = new CommandQueue(host)

		const first = settled(queue.enqueue('A'))
		const second = settled(queue.enqueue('B'))

		await vi.advanceTimersByTimeAsync(ACK_TIMEOUT_MS)

		await expect(first).resolves.toBe('rejected')
		await expect(second).resolves.toBe('rejected')
		expect(host.reconnect).toHaveBeenCalledTimes(1)
		expect(queue.depth).toBe(0)
	})

	it('ignores an acknowledgement that arrives after its command timed out', async () => {
		const { host, sent } = createHost()
		const queue = new CommandQueue(host)

		const first = settled(queue.enqueue('A'))
		await vi.advanceTimersByTimeAsync(ACK_TIMEOUT_MS)
		await expect(first).resolves.toBe('rejected')

		const second = settled(queue.enqueue('B'))
		expect(sent).toEqual(['A', 'B'])

		// The late ACK belongs to 'A'. Attributing it to 'B' would put every later command
		// permanently off by one, so it must be dropped.
		queue.handleAck()
		queue.handleAck()

		await expect(second).resolves.toBe('resolved')
		expect(queue.depth).toBe(0)
	})

	it('rejects the in-flight command and everything queued when flushed', async () => {
		const { host } = createHost()
		const queue = new CommandQueue(host)

		const results = [settled(queue.enqueue('A')), settled(queue.enqueue('B'))]

		queue.flush('Connection closed')

		await expect(Promise.all(results)).resolves.toEqual(['rejected', 'rejected'])
		expect(queue.depth).toBe(0)
	})

	it('does not send a stale command after a flush', async () => {
		const { host, sent } = createHost()
		const queue = new CommandQueue(host)

		void settled(queue.enqueue('A'))
		void settled(queue.enqueue('B'))

		queue.flush('Connection closed')

		expect(sent).toEqual(['A'])

		// A late acknowledgement must not pull the flushed command back onto the wire.
		queue.handleAck()
		expect(sent).toEqual(['A'])
	})

	it('rejects and reconnects when the socket is not connected', async () => {
		const { host, disconnect } = createHost()
		const queue = new CommandQueue(host)

		disconnect()
		const result = settled(queue.enqueue('A'))

		await expect(result).resolves.toBe('rejected')
		expect(host.reconnect).toHaveBeenCalledTimes(1)
	})

	it('stops the timeout once a command is acknowledged', async () => {
		const { host } = createHost()
		const queue = new CommandQueue(host)

		const result = settled(queue.enqueue('A'))
		queue.handleAck()
		await expect(result).resolves.toBe('resolved')

		await vi.advanceTimersByTimeAsync(ACK_TIMEOUT_MS * 2)

		expect(host.reconnect).not.toHaveBeenCalled()
	})
})
