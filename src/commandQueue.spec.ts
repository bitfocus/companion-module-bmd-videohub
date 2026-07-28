import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ACK_TIMEOUT_MS, CommandQueue, MAX_IN_FLIGHT, type CommandQueueHost } from './commandQueue.js'

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

	it(`sends up to ${MAX_IN_FLIGHT} commands before waiting for an acknowledgement`, async () => {
		const { host, sent } = createHost()
		const queue = new CommandQueue(host)

		const results = ['A', 'B', 'C', 'D', 'E'].map((cmd) => settled(queue.enqueue(cmd)))

		expect(sent).toEqual(['A', 'B', 'C', 'D'])
		expect(queue.depth).toBe(5)

		queue.handleAck()
		expect(sent).toEqual(['A', 'B', 'C', 'D', 'E'])

		for (let i = 0; i < 4; i++) queue.handleAck()

		await expect(Promise.all(results)).resolves.toEqual([
			'resolved',
			'resolved',
			'resolved',
			'resolved',
			'resolved',
		])
		expect(queue.depth).toBe(0)
	})

	it('settles in-flight commands in FIFO order on ACK', async () => {
		const { host } = createHost()
		const queue = new CommandQueue(host)

		const a = settled(queue.enqueue('A'))
		const b = settled(queue.enqueue('B'))
		const c = settled(queue.enqueue('C'))
		const d = settled(queue.enqueue('D'))

		queue.handleAck()
		await expect(a).resolves.toBe('resolved')

		let bSettled = false
		void b.then(() => {
			bSettled = true
		})
		await Promise.resolve()
		expect(bSettled).toBe(false)

		queue.handleAck()
		queue.handleAck()
		queue.handleAck()
		await expect(Promise.all([b, c, d])).resolves.toEqual(['resolved', 'resolved', 'resolved'])
	})

	it('rejects on NAK for the oldest only and keeps other in-flight commands', async () => {
		const { host, sent } = createHost()
		const queue = new CommandQueue(host)

		const results = ['A', 'B', 'C', 'D', 'E'].map((cmd) => settled(queue.enqueue(cmd)))
		expect(sent).toEqual(['A', 'B', 'C', 'D'])

		queue.handleNak()
		await expect(results[0]).resolves.toBe('rejected')
		expect(sent).toEqual(['A', 'B', 'C', 'D', 'E'])

		for (let i = 0; i < 4; i++) queue.handleAck()
		await expect(Promise.all(results.slice(1))).resolves.toEqual([
			'resolved',
			'resolved',
			'resolved',
			'resolved',
		])
		expect(host.reconnect).not.toHaveBeenCalled()
	})

	it('rejects everything and reconnects when any in-flight acknowledgement times out', async () => {
		const { host, sent } = createHost()
		const queue = new CommandQueue(host)

		const results = ['A', 'B', 'C', 'D', 'E'].map((cmd) => settled(queue.enqueue(cmd)))
		expect(sent).toEqual(['A', 'B', 'C', 'D'])

		await vi.advanceTimersByTimeAsync(ACK_TIMEOUT_MS)

		await expect(Promise.all(results)).resolves.toEqual([
			'rejected',
			'rejected',
			'rejected',
			'rejected',
			'rejected',
		])
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

		expect(sent).toEqual(['A', 'B'])

		// A late acknowledgement must not pull the flushed command back onto the wire.
		queue.handleAck()
		expect(sent).toEqual(['A', 'B'])
	})

	it('rejects without reconnecting when the socket is not connected', async () => {
		const { host, disconnect } = createHost()
		const queue = new CommandQueue(host)

		disconnect()
		const results = [settled(queue.enqueue('A')), settled(queue.enqueue('B')), settled(queue.enqueue('C'))]

		await expect(Promise.all(results)).resolves.toEqual(['rejected', 'rejected', 'rejected'])
		// TCPHelper owns reconnect-on-drop; the queue must not call init_tcp and thrash it.
		expect(host.reconnect).not.toHaveBeenCalled()
	})

	it('stops the timeout once a command is acknowledged', async () => {
		const { host } = createHost()
		const queue = new CommandQueue(host)

		const results = ['A', 'B'].map((cmd) => settled(queue.enqueue(cmd)))
		queue.handleAck()
		queue.handleAck()
		await expect(Promise.all(results)).resolves.toEqual(['resolved', 'resolved'])

		await vi.advanceTimersByTimeAsync(ACK_TIMEOUT_MS * 2)

		expect(host.reconnect).not.toHaveBeenCalled()
	})
})
