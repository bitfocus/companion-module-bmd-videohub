# ACK-gated send queue

**Date:** 2026-07-27
**Status:** Approved, ready for implementation plan

## Problem

The module writes every command straight to the socket with no flow control. When a
controller issues many routes at once, the Videohub silently applies only the beginning of
the burst and discards the rest.

Measured against a 16x16 Smart Videohub driven from Bitfocus Buttons, taken from the
module's own `TCP sending` debug log correlated with the device-reported routing state:

| Commands sent | Span | Applied by device |
| ------------- | ---- | ----------------- |
| 7             | 2 ms | all 7             |
| 7             | 3 ms | all 7             |
| 16            | 5 ms | **first 8 only**  |

The 16 commands were `VIDEO OUTPUT ROUTING` blocks for outputs 0-15, sent in order. The
device applied outputs 0-7 and dropped 8-15. Nothing failed: no NAK, no error, no socket
event. The module reported every command as sent, and the caller reported success.

`TCPHelper` sets `setNoDelay(true)`, so each `#sendCommand` becomes its own TCP segment.
A large burst arrives as many back-to-back segments within a few milliseconds, and the
device drops what it cannot take.

## Root cause

There is no limit on how many unacknowledged commands the module will put on the wire.
The protocol acknowledges every command block, but the module discards that signal, so
nothing throttles the sender to the rate the device can absorb.

## What the protocol guarantees

From the Blackmagic Videohub Ethernet Protocol v2.3 developer manual:

> The block must be terminated by a blank line. On receipt of a blank line, the Videohub
> Server will either acknowledge the request by responding: `ACK` or indicate that the
> request was not understood by responding: `NAK`

Every command block gets exactly one `ACK` or `NAK`. This includes `PING`:

> If the Videohub Server is responding, it will respond with an `ACK` message as for any
> other recognized command.

The manual is explicit that acknowledgement is *not* confirmation the change happened:

> After a positive response, the client should expect to see a status update from the
> Videohub Server showing the status change. This is likely to be the same as the command
> that was sent, but if the request could not be performed, or other changes were made
> simultaneously by other clients, there may be more updates in the block, or more blocks.
> Simultaneous updates could cancel each other out, leading to a response that is different
> to that expected.

> The asynchronous nature of the responses means that a client should never rely on the
> desired update actually occurring and must simply watch for status updates from the
> Videohub Server and use only these to update its local representation of the server state.

The manual documents no limit on command size, lines per block, or device buffers.

### Two distinct guarantees

- **Flow control** — never have more than one unacknowledged block outstanding, so the
  device is never overrun. This is what fixes the dropped commands, and this spec delivers it.
- **Confirmation a change applied** — obtainable only by watching the status update the
  device sends afterwards. `updateRouting()`, `updateLabels()` and `updateLocks()` already
  do this, and per the manual that is already correct. Unchanged by this spec.

A resolved promise from `VideohubApi` therefore means **accepted**, never **applied**.
This must be documented on the methods so callers do not over-read it. The existing comment
in `internalAPI.ts` — "prepare for the future when we will detect if the command was
successful" — is inaccurate and gets corrected: ACK was never going to mean success.

## Design

### Self-clocking queue

`VideohubApi.#sendCommand` stops writing to the socket. It appends to a FIFO queue and
returns a promise. A pump drains the queue with exactly one block in flight:

```
send block -> await ACK -> settle -> send next
```

The device's acknowledgement rate sets the send rate. The safe burst size is discovered
at runtime rather than configured, so it adapts to any model and any device load. No
tuning constants.

State on the queue owner:

- `#queue: PendingCommand[]` — waiting commands, FIFO
- `#inFlight: PendingCommand | undefined` — the one unacknowledged block
- `#timeout: NodeJS.Timeout | undefined` — ACK deadline for the in-flight command

where `PendingCommand` is `{ cmd: string; resolve: () => void; reject: (err: Error) => void }`.

### The queue must outlive `initThings()`

`initThings()` currently does `const api = new VideohubApi(this)` on every call, and it is
called from `#processVideohubInformation` on label and status updates — that is, in response
to the module's own commands. A queue held inside a per-`initThings` instance would be
discarded mid-flight.

`VideohubApi` becomes a single long-lived instance created in the `VideohubInstance`
constructor alongside `state`, and `initThings()` passes that same reference to
`getActions()`. This is a prerequisite for the queue, not an optional cleanup.

### Routing ACK and NAK to the queue

`#handleReceivedLine` already recognises `ACK` as a block header and then discards it at
`main.ts:184` via `if (cmd !== 'ACK')`. `NAK` is recognised nowhere: it matches neither
`/:/` nor `'ACK'`, so it currently falls through to the `weird response from videohub` log.

Both are handled by extending the existing block parser rather than special-casing lines.
The device sends `ACK` followed by a blank line, so acknowledgement is dispatched at block
termination, consistent with every other block:

- add `line === 'NAK'` alongside `line === 'ACK'` in the block-header condition
- at block termination, dispatch `ACK` to `handleAck()`, `NAK` to `handleNak()`, and
  everything else to `#processVideohubInformation()` as today

Unsolicited status updates interleave freely with acknowledgements. Only `ACK` and `NAK`
settle the in-flight command, so the existing update handlers are untouched.

### Every write goes through the queue

`main.ts:164` sends `PING:\n\n` directly through `this.socket.send`, bypassing
`VideohubApi`. Since the device acknowledges pings like any other command, that ACK would
be matched against whatever command is in flight and corrupt the accounting. The ping moves
onto the queue.

**Invariant: no code path may write to the socket except through the queue.** Every bypass
desynchronises ACK accounting. This is the property the whole design rests on.

### Error handling

Fail fast. No retries, so a command never runs twice and a stale route cannot land late.

| Event | Behaviour |
| ----- | --------- |
| `NAK` | Reject the in-flight command, log an error, continue with the queue |
| ACK timeout (2 s) | Reject the in-flight command, log an error, **reconnect** |
| Disconnect | Reject the in-flight command and everything queued |
| Socket not connected when pumping | Reject everything queued, call `init_tcp()` |

`NAK` means "not understood" per the manual — a malformed command that will never succeed,
so retrying is pointless and the queue continues normally.

**Why a timeout reconnects rather than just rejecting.** If a command times out and the
queue moves on, a late ACK settles the *next* command. That command's own ACK then settles
the one after it, and every subsequent command is permanently settled by its predecessor's
acknowledgement — silently, with the queue still appearing healthy. Since the manual
guarantees an acknowledgement for every recognised command, a missing ACK is not slowness;
it means the device is wedged or the stream is no longer trustworthy. Continuing to send on
a stream that can no longer be accounted for reintroduces exactly the class of silent
failure this change removes.

Reconnecting is also the established recovery in this module: `main.ts:157` already does
`init_tcp()` on "No data received from device in 30s". A reconnect additionally triggers the
initial status dump, which re-syncs local state from the device — the source of truth the
manual prescribes.

The 2 s deadline sits well inside the 5 s action RPC timeout used by Bitfocus Buttons, so a
wedged device surfaces as a module error rather than an opaque caller-side timeout.

`destroy()` flushes the queue so nothing is left pending when the instance goes away.

## Scope

**In scope:** the queue, the `VideohubApi` lifetime fix, ACK/NAK parsing, moving the ping
onto the queue, error handling above.

**Out of scope:** a batched multi-route action. Considered and deliberately dropped —
the queue alone fixes the reported bug. `setMultipleOutputRoutes()` is unchanged and
inherits queueing for free because it goes through `#sendCommand`.

**Downstream, not part of this change:** the Buttons-side `bmd_videohub_3_0_0.ts`
`routeHandler` carries a `ROUTE_BURST_SIZE` / `ROUTE_BURST_DELAY_MS` pacing workaround, and
`setLockHandler` carries a 50 ms inter-command sleep. Both become unnecessary once this
ships and should be removed then, not before.

## Testing

The repo has no test framework, no test script, and no test files.

**Decision: add vitest and test the queue.** The queue is pure logic and carries all the
real edge cases, and its failure modes are silent and ordering-dependent — precisely what
regression tests are for. Cost is one devDependency, a `test` script, and one test file.

Cases to cover:

- commands are sent in FIFO order, one at a time
- the next command is not sent until the previous one is acknowledged
- `NAK` rejects that command and the queue continues
- an ACK timeout rejects and triggers a reconnect
- a disconnect rejects the in-flight command and everything queued
- an ACK arriving with nothing in flight is ignored, not misattributed

This targets upstream `bitfocus/companion-module-bmd-videohub`. If the maintainers object
to a test runner arriving with this PR, the tests are isolated to their own file and the
devDependency can be dropped without touching the implementation.

Manual verification against real hardware regardless, since only that exercises the actual
firmware behaviour:

- Route 16 destinations at once from Buttons ExecuteView with the Buttons-side pacing
  workaround removed. All 16 must apply. This is the reported bug.
- Confirm the module's debug log shows commands serialised, each following its predecessor's
  ACK, rather than a burst inside a few milliseconds.
- Pull the network cable mid-burst; queued commands must reject and the module must recover
  on reconnect without stuck state.
- Confirm normal single routes show no perceptible added latency.
