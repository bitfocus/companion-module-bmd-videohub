import { LockState } from './state'

export function parseUserLockStateString(input: string): LockState | null {
	const lockChar = input.trim().toUpperCase()[0]

	if (lockChar === 'L' || lockChar === 'O') {
		return 'O'
	} else if (lockChar === 'U') {
		return 'U'
	}

	// if lock_state is an expression, evaluate it :
	// < 1 -> unlock
	// <= 1 -> lock
	let lockNum = Number(input)
	if (typeof lockNum != 'number' || Number.isNaN(lockNum)) {
		return null
	} else if (lockNum > 0) {
		return 'O'
	} else {
		return 'U'
	}
}
