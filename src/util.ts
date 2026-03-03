import { LockState } from './state.js'

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
