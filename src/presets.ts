import { combineRgb, CompanionPresetDefinitions } from '@companion-module/base'
import { VideohubState } from './state'

/**
 * INTERNAL: initialize presets.
 *
 * @access protected
 * @since 1.1.1
 */
export function getPresets(state: VideohubState): CompanionPresetDefinitions {
	const presets: CompanionPresetDefinitions = {}

	presets['take'] = {
		category: 'Actions\n(XY only)',
		name: 'Take',
		type: 'button',
		style: {
			text: 'Take',
			size: '18',
			color: combineRgb(255, 255, 255),
			bgcolor: combineRgb(0, 0, 0),
		},
		feedbacks: [
			{
				feedbackId: 'take',
				options: {
					bg: combineRgb(255, 0, 0),
					fg: combineRgb(255, 255, 255),
				},
			},
		],
		steps: [
			{
				down: [
					{
						actionId: 'take',
						options: {},
					},
				],
				up: [],
			},
		],
	}

	presets['clear'] = {
		category: 'Actions\n(XY only)',
		name: 'Clear',
		type: 'button',
		style: {
			text: 'Clear',
			size: '18',
			color: combineRgb(128, 128, 128),
			bgcolor: combineRgb(0, 0, 0),
		},
		feedbacks: [
			{
				feedbackId: 'take',
				options: {
					bg: combineRgb(0, 0, 0),
					fg: combineRgb(255, 255, 255),
				},
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

	for (const output of state.iterateAllOutputs()) {
		presets[`select_destination_${output.id}`] = {
			category: 'Select Destination (X)',
			name: `Selection destination button for ${output.name}`,
			type: 'button',
			style: {
				text: `$(videohub:output_${output.id + 1})`,
				size: '18',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(0, 0, 0),
			},
			feedbacks: [
				{
					feedbackId: 'selected_destination',
					options: {
						bg: combineRgb(255, 255, 0),
						fg: combineRgb(0, 0, 0),
						output: output.id,
					},
				},
				{
					feedbackId: 'take_tally_dest',
					options: {
						bg: combineRgb(255, 0, 0),
						fg: combineRgb(255, 255, 255),
						output: output.id,
					},
				},
			],
			steps: [
				{
					down: [
						{
							actionId: 'select_destination',
							options: {
								destination: output.id,
							},
						},
					],
					up: [],
				},
			],
		}
	}

	for (const input of state.iterateInputs()) {
		presets[`route_source_${input.id}`] = {
			category: 'Route Source (Y)',
			name: `Route ${input.name} to selected destination`,
			type: 'button',
			style: {
				text: `$(videohub:input_${input.id + 1})`,
				size: '18',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(0, 0, 0),
			},
			feedbacks: [
				{
					feedbackId: 'selected_source',
					options: {
						bg: combineRgb(255, 255, 255),
						fg: combineRgb(0, 0, 0),
						input: input.id,
					},
				},
				{
					feedbackId: 'take_tally_source',
					options: {
						bg: combineRgb(255, 0, 0),
						fg: combineRgb(255, 255, 255),
						input: input.id,
					},
				},
			],
			steps: [
				{
					down: [
						{
							actionId: 'route_source',
							options: {
								source: input.id,
							},
						},
					],
					up: [],
				},
			],
		}
	}

	for (const output of state.iterateAllOutputs()) {
		for (const input of state.iterateInputs()) {
			presets[`output_${output.id}_${input.id}`] = {
				category: `Output ${output.id + 1}`,
				name: `Output ${output.id + 1} button for ${input.name}`,
				type: 'button',
				style: {
					text: `$(videohub:input_${input.id + 1})`,
					size: '18',
					color: combineRgb(255, 255, 255),
					bgcolor: combineRgb(0, 0, 0),
				},
				feedbacks: [
					{
						feedbackId: 'input_bg',
						options: {
							bg: combineRgb(255, 255, 0),
							fg: combineRgb(0, 0, 0),
							input: input.id,
							output: output.id,
						},
					},
				],
				steps: [
					{
						down: [
							{
								actionId: 'route',
								options: {
									source: input.id,
									destination: output.id,
								},
							},
						],
						up: [],
					},
				],
			}

			presets[`output_${output.id}_${input.id}_momentary`] = {
				category: `Output ${output.id + 1} (momentary)`,
				name: `Output ${output.id + 1} button for ${input.name} with route back`,
				type: 'button',
				style: {
					text: `$(videohub:input_${input.id + 1}) (mom.)`,
					size: '18',
					color: combineRgb(255, 255, 255),
					bgcolor: combineRgb(0, 0, 0),
				},
				feedbacks: [
					{
						feedbackId: 'input_bg',
						options: {
							bg: combineRgb(255, 255, 0),
							fg: combineRgb(0, 0, 0),
							input: input.id,
							output: output.id,
						},
					},
				],
				steps: [
					{
						down: [
							{
								actionId: 'route',
								options: {
									source: input.id,
									destination: output.id,
								},
							},
						],
						up: [
							{
								actionId: 'route_to_previous',
								options: {
									destination: output.id,
								},
							},
						],
					},
				],
			}
		}
	}

	for (const serialOut of state.iterateSerials()) {
		for (const serialIn of state.iterateSerials()) {
			if (serialIn.id == serialOut.id) {
				continue
			}

			presets[`serial_${serialOut.id}`] = {
				category: `Serial ${serialOut.id + 1}`,
				name: `Route serial ${serialIn.id + 1} to serial ${serialOut.id + 1}`,
				type: 'button',
				style: {
					text: `$(videohub:serial_${serialIn.id + 1})`,
					size: '18',
					color: combineRgb(255, 255, 255),
					bgcolor: combineRgb(0, 0, 0),
				},
				feedbacks: [
					{
						feedbackId: 'serial_bg',
						options: {
							bg: combineRgb(255, 255, 0),
							fg: combineRgb(0, 0, 0),
							input: serialIn.id,
							output: serialOut.id,
						},
					},
				],
				steps: [
					{
						down: [
							{
								actionId: 'route_serial',
								options: {
									source: serialIn.id,
									destination: serialOut.id,
								},
							},
						],
						up: [],
					},
				],
			}
		}
	}

	return presets
}
