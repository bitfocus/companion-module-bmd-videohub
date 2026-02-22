import {
	CompanionPresetDefinitions,
	CompanionPresetGroupTemplate,
	CompanionPresetSection,
} from '@companion-module/base'
import { VideohubState } from './state.js'
import { VideohubTypes } from './types.js'

/**
 * INTERNAL: initialize presets.
 *
 * @access protected
 * @since 1.1.1
 */
export function getPresets(
	state: VideohubState,
): [structure: CompanionPresetSection[], presets: CompanionPresetDefinitions<VideohubTypes>] {
	const presets: CompanionPresetDefinitions<VideohubTypes> = {}

	presets['take'] = {
		name: 'Take',
		type: 'simple',
		style: {
			text: 'Take',
			size: '18',
			color: 0xffffff,
			bgcolor: 0x000000,
		},
		feedbacks: [
			{
				feedbackId: 'take',
				style: {
					bgcolor: 0xff0000,
					color: 0xffffff,
				},
				options: {},
			},
		],
		steps: [
			{
				down: [
					{
						actionId: 'take',
						options: {
							ignore_lock: false,
						},
					},
				],
				up: [],
			},
		],
	}

	presets['clear'] = {
		name: 'Clear',
		type: 'simple',
		style: {
			text: 'Clear',
			size: '18',
			color: 0x808080,
			bgcolor: 0x000000,
		},
		feedbacks: [
			{
				feedbackId: 'take',
				style: {
					bgcolor: 0x000000,
					color: 0xffffff,
				},
				options: {},
			},
		],
		steps: [
			{
				down: [
					{
						actionId: 'clear',
						options: {},
					},
				],
				up: [],
			},
		],
	}

	presets[`select_destination`] = {
		name: `Selection destination button for X`,
		type: 'simple',
		style: {
			text: `$(videohub:output_$(local:output))`,
			size: '18',
			color: 0xffffff,
			bgcolor: 0x000000,
		},
		feedbacks: [
			{
				feedbackId: 'selected_destination',
				style: {
					bgcolor: 0xffff00,
					color: 0x000000,
				},
				options: {
					output: { isExpression: true, value: '$(local:output)' },
				},
			},
			{
				feedbackId: 'take_tally_dest',
				style: {
					bgcolor: 0xff0000,
					color: 0xffffff,
				},
				options: {
					output: { isExpression: true, value: '$(local:output)' },
				},
			},
		],
		steps: [
			{
				down: [
					{
						actionId: 'select_destination',
						options: {
							destination: { isExpression: true, value: '$(local:output)' },
						},
					},
				],
				up: [],
			},
		],
		localVariables: [
			{
				variableType: 'simple',
				variableName: 'output',
				startupValue: 1,
			},
		],
	}

	presets[`route_source`] = {
		name: `Route Y to selected destination`,
		type: 'simple',
		style: {
			text: `$(videohub:input_$(local:input))`,
			size: '18',
			color: 0xffffff,
			bgcolor: 0x000000,
		},
		feedbacks: [
			{
				feedbackId: 'selected_source',
				style: {
					bgcolor: 0xffffff,
					color: 0x000000,
				},
				options: {
					input: { isExpression: true, value: '$(local:input)' },
				},
			},
			{
				feedbackId: 'take_tally_source',
				style: {
					bgcolor: 0xff0000,
					color: 0xffffff,
				},
				options: {
					input: { isExpression: true, value: '$(local:input)' },
				},
			},
		],
		steps: [
			{
				down: [
					{
						actionId: 'route_source',
						options: {
							source: { isExpression: true, value: '$(local:input)' },
							ignore_lock: false,
						},
					},
				],
				up: [],
			},
		],
		localVariables: [
			{
				variableType: 'simple',
				variableName: 'input',
				startupValue: 1,
			},
		],
	}

	presets[`route_output`] = {
		name: `Output X button for Y`,
		type: 'simple',
		style: {
			text: `$(videohub:input_$(local:input))`,
			size: '18',
			color: 0xffffff,
			bgcolor: 0x000000,
		},
		feedbacks: [
			{
				feedbackId: 'input_bg',
				style: {
					bgcolor: 0xffff00,
					color: 0x000000,
				},
				options: {
					input: { isExpression: true, value: '$(local:input)' },
					output: { isExpression: true, value: '$(local:output)' },
				},
			},
		],
		steps: [
			{
				down: [
					{
						actionId: 'route',
						options: {
							source: { isExpression: true, value: '$(local:input)' },
							destination: { isExpression: true, value: '$(local:output)' },
							ignore_lock: false,
						},
					},
				],
				up: [],
			},
		],
		localVariables: [
			{
				variableType: 'simple',
				variableName: 'input',
				startupValue: 1,
			},
			{
				variableType: 'simple',
				variableName: 'output',
				startupValue: 1,
			},
		],
	}

	presets[`route_output_momentary`] = {
		name: `Output X button for Y (momentary)`,
		type: 'simple',
		style: {
			text: `$(videohub:input_$(local:input))`,
			size: '18',
			color: 0xffffff,
			bgcolor: 0x000000,
		},
		feedbacks: [
			{
				feedbackId: 'input_bg',
				style: {
					bgcolor: 0xffff00,
					color: 0x000000,
				},
				options: {
					input: { isExpression: true, value: '$(local:input)' },
					output: { isExpression: true, value: '$(local:output)' },
				},
			},
		],
		steps: [
			{
				down: [
					{
						actionId: 'route',
						options: {
							source: { isExpression: true, value: '$(local:input)' },
							destination: { isExpression: true, value: '$(local:output)' },
							ignore_lock: false,
						},
					},
				],
				up: [
					{
						actionId: 'route_to_previous',
						options: {
							destination: { isExpression: true, value: '$(local:output)' },
							ignore_lock: false,
						},
					},
				],
			},
		],
		localVariables: [
			{
				variableType: 'simple',
				variableName: 'input',
				startupValue: 1,
			},
			{
				variableType: 'simple',
				variableName: 'output',
				startupValue: 1,
			},
		],
	}

	presets[`route_serial`] = {
		name: `Route serial X to serial Y`,
		type: 'simple',
		style: {
			text: `$(videohub:serial_$(local:input))`,
			size: '18',
			color: 0xffffff,
			bgcolor: 0x000000,
		},
		feedbacks: [
			{
				feedbackId: 'serial_bg',
				style: {
					bgcolor: 0xffff00,
					color: 0x000000,
				},
				options: {
					input: { isExpression: true, value: '$(local:input)' },
					output: { isExpression: true, value: '$(local:output)' },
				},
			},
		],
		steps: [
			{
				down: [
					{
						actionId: 'route_serial',
						options: {
							source: { isExpression: true, value: '$(local:input)' },
							destination: { isExpression: true, value: '$(local:output)' },
							ignore_lock: false,
						},
					},
				],
				up: [],
			},
		],
		localVariables: [
			{
				variableType: 'simple',
				variableName: 'input',
				startupValue: 1,
			},
			{
				variableType: 'simple',
				variableName: 'output',
				startupValue: 1,
			},
		],
	}

	const structure: CompanionPresetSection<VideohubTypes>[] = [
		{
			id: 'xy-routing',
			name: 'XY Routing',
			description: 'Presets for routing a specific source to the selected destination, using a 2 step process',
			definitions: [
				{
					id: 'actions',
					name: 'Actions',
					description: 'Presets for routing a specific source to the selected destination, using a 2 step process',
					type: 'simple',
					presets: ['take', 'clear'],
				},
				{
					id: 'select_destination',
					name: 'Select Destination (X)',
					type: 'template',
					presetId: 'select_destination',
					templateVariableName: 'output',
					templateValues: state.iterateAllOutputs().map((output) => ({
						name: `Selection destination button for ${output.name}`,
						value: output.outputId + 1,
					})),
				},
				{
					id: 'route_source',
					name: 'Route Source (Y)',
					type: 'template',
					presetId: 'route_source',
					templateVariableName: 'input',
					templateValues: state.iterateInputs().map((input) => ({
						name: `Route ${input.name} to selected destination`,
						value: input.id + 1,
					})),
				},
			],
		},
		{
			id: 'fixed-routing',
			name: 'Fixed Routing',
			definitions: state
				.iteratePrimaryOutputs()
				.slice(0, 40) // HACK: Limit to avoid UI lockup
				.map(
					(output): CompanionPresetGroupTemplate => ({
						id: `fixed_output_${output.outputId}`,
						name: `To Output ${output.outputId + 1}`,
						type: 'template',
						presetId: 'route_output',
						templateVariableName: 'input',
						templateValues: state
							.iterateInputs()
							.slice(0, 40) // HACK: Limit to avoid UI lockup
							.map((input) => ({
								name: `Output ${output.outputId + 1} button for ${input.name}`,
								value: input.id + 1,
							})),
						commonVariableValues: {
							output: output.outputId + 1,
						},
					}),
				),
		},
		{
			id: 'momentary-routing',
			name: 'Momentary Routing',
			definitions: state
				.iteratePrimaryOutputs()
				.slice(0, 40) // HACK: Limit to avoid UI lockup
				.map(
					(output): CompanionPresetGroupTemplate => ({
						id: `momentary_output_${output.outputId}`,
						name: `To Output ${output.outputId + 1}`,
						type: 'template',
						presetId: 'route_output_momentary',
						templateVariableName: 'input',
						templateValues: state
							.iterateInputs()
							.slice(0, 40) // HACK: Limit to avoid UI lockup
							.map((input) => ({
								name: `Output ${output.outputId + 1} button for ${input.name} (momentary)`,
								value: input.id + 1,
							})),
						commonVariableValues: {
							output: output.outputId + 1,
						},
					}),
				),
		},
	]

	if (state.iterateSerials().length > 0) {
		structure.push({
			id: 'serial-routing',
			name: 'Serial Routing',
			definitions: state
				.iterateSerials()
				.slice(0, 20) // HACK: Limit to avoid UI lockup
				.map(
					(serialOut): CompanionPresetGroupTemplate => ({
						id: `serial_output_${serialOut.id}`,
						name: `To Serial ${serialOut.id + 1}`,
						type: 'template',
						presetId: 'route_serial',
						templateVariableName: 'input',
						templateValues: state
							.iterateSerials()
							.slice(0, 20) // HACK: Limit to avoid UI lockup
							.filter((v) => v.id !== serialOut.id) // Don't route a serial port to itself
							.map((serialIn) => ({
								name: `Route Serial ${serialIn.id + 1} to ${serialOut.id + 1}`,
								value: serialIn.id + 1,
							})),
						commonVariableValues: {
							output: serialOut.id + 1,
						},
					}),
				),
		})
	}

	return [structure, presets]
}
