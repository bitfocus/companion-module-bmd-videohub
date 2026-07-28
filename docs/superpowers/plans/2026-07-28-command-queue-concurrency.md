# Command Queue Concurrency (4 In Flight) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow up to 4 Videohub commands in flight at once, still FIFO-matched to ACK/NAK, with per-command ACK timeouts that flush everything and reconnect on first expiry.

**Architecture:** Replace the single `#inFlight` slot in `CommandQueue` with an array capped by `MAX_IN_FLIGHT = 4`. `#pump` fills the window; ACK/NAK settle the oldest entry; each entry owns its own timeout timer.

**Tech Stack:** TypeScript, Vitest (fake timers), existing `CommandQueue` / `CommandQueueHost` in this Companion module.

**Spec:** `docs/superpowers/specs/2026-07-28-command-queue-concurrency-design.md`

## Global Constraints

- `MAX_IN_FLIGHT = 4` (hardcoded export next to `ACK_TIMEOUT_MS`)
- ACK/NAK settle the **oldest** in-flight command (FIFO)
- Independent `ACK_TIMEOUT_MS` timer per in-flight command; first expiry → flush all + `reconnect()`
- Not connected → flush only; do **not** call `reconnect()` from `#pump`
- Host API unchanged; no Companion config changes

## File Structure

- Modify: `src/commandQueue.ts` — concurrency window, per-command timers
- Modify: `src/commandQueue.spec.ts` — update serial assumptions; add concurrency cases
- No changes to `src/internalAPI.ts` / `src/main.ts` (public queue API unchanged)

---

### Task 1: Windowed send + FIFO settle

**Files:**
- Modify: `src/commandQueue.ts`
- Modify: `src/commandQueue.spec.ts`

**Interfaces:**
- Produces: `export const MAX_IN_FLIGHT = 4`
- Produces: `#inFlight: PendingCommand[]` with optional `timer?: NodeJS.Timeout` on each command
- Consumes: existing `CommandQueueHost`, `ACK_TIMEOUT_MS`, `enqueue` / `handleAck` / `handleNak` / `flush` / `depth`

- [ ] **Step 1: Rewrite the serial gating test for a window of 4**

Replace `holds every later command until the one in flight is acknowledged` with tests that match the spec:

```ts
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

	const results = ['A', 'B', 'C', 'D'].map((cmd) => settled(queue.enqueue(cmd)))

	queue.handleAck()
	await expect(results[0]).resolves.toBe('resolved')
	expect(results[1]).toBeTruthy()
	// B, C, D still pending until their ACKs
	await Promise.resolve()
	await expect(Promise.race([results[1], Promise.resolve('pending')])).resolves.toBe('pending')

	queue.handleAck()
	queue.handleAck()
	queue.handleAck()
	await expect(Promise.all(results)).resolves.toEqual([
		'resolved',
		'resolved',
		'resolved',
		'resolved',
	])
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
```

Also update `does not send a stale command after a flush` — with concurrency 4, both A and B are sent before flush:

```ts
expect(sent).toEqual(['A', 'B'])
```

Import `MAX_IN_FLIGHT` from `./commandQueue.js`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/commandQueue.spec.ts`

Expected: FAIL — still serial (only `'A'` sent for a burst of 5), and/or `MAX_IN_FLIGHT` not exported.

- [ ] **Step 3: Implement windowed in-flight array**

In `src/commandQueue.ts`:

1. Export `MAX_IN_FLIGHT = 4`.
2. Add optional `timer?: NodeJS.Timeout` on `PendingCommand`.
3. Replace `#inFlight: PendingCommand | undefined` and `#timer` with `#inFlight: PendingCommand[] = []`.
4. Update `depth` to `#queue.length + #inFlight.length`.
5. `#pump`: while `#inFlight.length < MAX_IN_FLIGHT` and queue non-empty:
   - if not connected → flush and return
   - shift, push to `#inFlight`, send; on throw reject that cmd, pop it, continue
   - else `command.timer = setTimeout(() => this.#handleTimeout(), ACK_TIMEOUT_MS)`
6. `#settle`: if `#inFlight.length === 0` ignore; else shift oldest, clear its timer, resolve/reject, `#pump()`.
7. `flush`: for each in-flight clear timer; reject `[...#inFlight, ...#queue]`; empty both arrays.
8. `#handleTimeout`: clear is via flush; log; flush; reconnect. (Timers on siblings cleared in flush.)
9. Remove `#clearTimer` / single `#timer`; add `#clearCommandTimer(command)` helper.
10. Update class docstring to describe a window of `MAX_IN_FLIGHT` instead of “exactly one”.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/commandQueue.spec.ts`

Expected: PASS for Task 1 tests. Fix any remaining tests that assumed serial send of only `'A'`.

- [ ] **Step 5: Commit**

```bash
git add src/commandQueue.ts src/commandQueue.spec.ts
git commit -m "feat: allow up to 4 in-flight Videohub commands"
```

---

### Task 2: Per-command timeout + remaining edge cases

**Files:**
- Modify: `src/commandQueue.spec.ts` (and `src/commandQueue.ts` only if Task 1 left timer gaps)

**Interfaces:**
- Consumes: per-command `timer` on `PendingCommand`, `flush` + `reconnect` on first timeout

- [ ] **Step 1: Add / adjust timeout tests for multiple in-flight**

```ts
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

it('does not fire a settled command timeout after ACK', async () => {
	const { host } = createHost()
	const queue = new CommandQueue(host)

	const results = ['A', 'B'].map((cmd) => settled(queue.enqueue(cmd)))
	queue.handleAck()
	await expect(results[0]).resolves.toBe('resolved')

	await vi.advanceTimersByTimeAsync(ACK_TIMEOUT_MS)

	// B was sent at the same time as A; its timer may still be live — ACK it before asserting,
	// or advance only after B is also ACKed:
	queue.handleAck()
	await expect(results[1]).resolves.toBe('resolved')
	await vi.advanceTimersByTimeAsync(ACK_TIMEOUT_MS)
	expect(host.reconnect).not.toHaveBeenCalled()
})
```

Keep existing tests:

- late ACK after timeout ignored (still valid with concurrency)
- flush rejects all
- disconnect rejects without reconnect
- `stops the timeout once a command is acknowledged` (single command case)

Replace the old “rejects everything… never arrives” test if duplicated by the multi in-flight version above.

- [ ] **Step 2: Run full queue suite**

Run: `npx vitest run src/commandQueue.spec.ts`

Expected: all PASS.

- [ ] **Step 3: Commit**

```bash
git add src/commandQueue.ts src/commandQueue.spec.ts
git commit -m "test: cover per-command ACK timeouts with concurrent in-flight"
```

---

## Spec coverage checklist

| Spec requirement | Task |
| --- | --- |
| `MAX_IN_FLIGHT = 4` | 1 |
| FIFO ACK/NAK | 1 |
| Pump fills window | 1 |
| Per-command timer; first expiry flush + reconnect | 1–2 |
| NAK settles oldest only | 1 |
| Not connected: flush, no reconnect | 1 (existing test kept) |
| Late ACK ignored | 2 (existing test kept) |
| Host API unchanged | 1 (no internalAPI changes) |
