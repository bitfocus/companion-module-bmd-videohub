# Command queue concurrency (max 4 in flight)

## Problem

The Videohub command queue currently keeps exactly one unacknowledged command on the wire. That is safe (the device silently drops excess burst commands) but slow when many Companion actions fire together.

We want a bounded pipeline: up to **4** commands may be in flight at once, still gated on ACK/NAK so the device’s reply rate limits further sends.

## Constraints

- Videohub ACKs/NAKs have **no correlation ID**. Matching must be FIFO: each ACK/NAK settles the **oldest** in-flight command.
- Too large a burst is silently discarded by the device. Concurrency of 4 is a hardcoded safe window (`MAX_IN_FLIGHT = 4`), not discovered dynamically.
- When the ACK stream can no longer be trusted, flush everything and reconnect (same policy as today).
- `TCPHelper` already reconnects on socket drop. The queue must **not** call `reconnect()` merely because `isConnected()` is false (that would thrash `init_tcp`).

## Decisions

| Topic | Choice |
| --- | --- |
| Max in flight | Hardcoded `MAX_IN_FLIGHT = 4` |
| ACK/NAK matching | FIFO — settle oldest in-flight |
| Timeout | Independent `ACK_TIMEOUT_MS` timer **per** in-flight command; first expiry flushes all + reconnects |
| NAK | Settle oldest only; do not flush the rest |
| Not connected | Flush pending; do not reconnect from the queue |
| Host API | Unchanged |

## Design

### Data model

Replace the single `#inFlight` slot with:

```ts
interface PendingCommand {
  cmd: string
  resolve: () => void
  reject: (error: Error) => void
  timer?: NodeJS.Timeout
}

#queue: PendingCommand[]      // waiting to send
#inFlight: PendingCommand[]   // sent, awaiting ACK/NAK; length ≤ MAX_IN_FLIGHT
```

`depth` = `#queue.length + #inFlight.length`.

### Pump

While `#inFlight.length < MAX_IN_FLIGHT` and `#queue` is non-empty:

1. If not connected → `flush('Socket not connected')` and return (no reconnect).
2. Shift next from `#queue`, push onto `#inFlight`, `send(cmd)`.
3. On send throw → reject that command, remove it from `#inFlight`, continue pumping.
4. Otherwise start a per-command timer for `ACK_TIMEOUT_MS`.

### Settle (ACK / NAK)

1. If `#inFlight` is empty → debug-log and ignore (late reply after flush/timeout).
2. Shift the oldest in-flight command, clear its timer.
3. Resolve (ACK) or reject (NAK).
4. Call `#pump()` to refill the window.

### Timeout

When any in-flight timer fires:

1. Log error.
2. `flush(...)` — clears all in-flight timers, rejects every in-flight and waiting command.
3. `host.reconnect()` — tears down the wedged-but-still-“connected” socket so state re-syncs.

### Flush

Clear every in-flight timer, reject all in-flight + waiting, empty both arrays. Used on disconnect, destroy, timeout, and not-connected pump.

## Out of scope

- Configurable concurrency (constructor or Companion config).
- Sliding / shared timeout window.
- Rejecting only the timed-out command while keeping siblings in flight.
- Changing how `internalAPI` / `main.ts` wire the host (beyond whatever the queue’s public methods already require).

## Testing

Update existing serial-queue expectations and add:

- Five enqueues while connected → first four sent immediately; fifth waits for an ACK.
- Four in flight → four ACKs settle in enqueue order.
- One of several in-flight timers expires → all rejected, `reconnect` called once.
- Late ACK after flush still ignored.
- Disconnected enqueue rejects without calling `reconnect`.
- NAK settles only the oldest; remaining in-flight stay; pump may send the next waiting command.

## Success criteria

- Bursts of ≤4 commands leave the module without waiting for intermediate ACKs.
- A 5th command does not hit the wire until an ACK frees a slot.
- Wedged device (no ACK within 2s for any in-flight command) still surfaces as flush + reconnect.
- No reconnect thrash when many commands arrive while the socket is down.
