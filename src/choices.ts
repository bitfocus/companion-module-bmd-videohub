import type { DropdownChoice, CompanionVariableValues } from '@companion-module/base'
import type { VideohubState } from './state'

export interface InputChoicesResult {
	inputChoices: DropdownChoice[]
	outputChoices: DropdownChoice[]
	serialChoices: DropdownChoice[]
	lockChoices: DropdownChoice[]
}


export const LOCKSTATES: CompanionVariableValues = {
	L: 'Locked',
	O: 'Owned',
	U: 'Unlocked'
}


/**
 * INTERNAL: use model data to define the choices for the dropdowns.
 */
export function getInputChoices(state: VideohubState): InputChoicesResult {
	const result: InputChoicesResult = {
		inputChoices: [],
		outputChoices: [],
		serialChoices: [],
		lockChoices: [{ id: 'U', label: 'Unlock' }, { id: 'O', label: 'Lock' }]
	}

	for (const input of state.iterateInputs()) {
		if (input.status != 'None') {
			result.inputChoices.push({ id: input.id, label: input.label })
		}
	}

	for (const output of state.iterateAllOutputs()) {
		if (output.status != 'None') {
			result.outputChoices.push({ id: output.id, label: output.label })
		}
	}

	for (const serial of state.iterateSerials()) {
		if (serial.status != 'None') {
			result.serialChoices.push({ id: serial.id, label: serial.label })
		}
	}

	return result
}

// export const SerialDirectionChoices: DropdownChoice[] = [
// 	{ id: 'auto', label: 'Automatic' },
// 	{ id: 'control', label: 'In (Workstation)' },
// 	{ id: 'slave', label: 'Out (Deck)' },
// ]
