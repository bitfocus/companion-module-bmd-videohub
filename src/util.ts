import { LockState } from './state.js'

/**
 * Step a 0-indexed value by an offset within `[0, count)`.
 * When `wrap` is true the value wraps around the ends, otherwise it is clamped.
 * Returns undefined if there is nothing to step (count <= 0).
 */
export function stepIndex(current: number, offset: number, count: number, wrap: boolean): number | undefined {
	if (count <= 0) return undefined

	const next = current + offset
	if (wrap) {
		return ((next % count) + count) % count
	} else {
		return Math.max(0, Math.min(count - 1, next))
	}
}

export function parseUserLockStateString(input: string): LockState | 'T' | null {
	const lockChar = input.trim().toUpperCase()[0]

	if (lockChar === 'T') {
		return 'T'
	} else if (lockChar === 'L' || lockChar === 'O') {
		return 'O'
	} else if (lockChar === 'U') {
		return 'U'
	}

	// if lock_state is an expression, evaluate it :
	// <= 1 -> unlock
	// >= 1 -> lock
	// == 0 -> toggle
	let lockNum = Number(input)
	if (typeof lockNum != 'number' || Number.isNaN(lockNum)) {
		return null
	} else if (lockNum > 0) {
		return 'O'
	} else if (lockNum < 0) {
		return 'U'
	} else {
		return 'T'
	}
}
