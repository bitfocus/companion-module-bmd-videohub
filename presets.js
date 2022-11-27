import { combineRgb } from '@companion-module/base'

/**
 * INTERNAL: initialize presets.
 *
 * @access protected
 * @since 1.1.1
 */
export function initPresets() {
	const presets = {}

	presets['take'] = {
		category: 'Actions\n(XY only)',
		label: 'Take',
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
		label: 'Clear',
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

	for (let i = 0; i < this.outputCount + this.monitoringCount; i++) {
		presets[`select_destination_${i}`] = {
			category: 'Select Destination (X)',
			label: 'Selection destination button for ' + this.getOutput(i).name,
			type: 'button',
			style: {
				text: '$(videohub:output_' + (i + 1) + ')',
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
						output: i,
					},
				},
				{
					feedbackId: 'take_tally_dest',
					options: {
						bg: combineRgb(255, 0, 0),
						fg: combineRgb(255, 255, 255),
						output: i,
					},
				},
			],
			steps: [
				{
					down: [
						{
							actionId: 'select_destination',
							options: {
								destination: i,
							},
						},
					],
					up: [],
				},
			],
		}
	}

	for (let i = 0; i < this.inputCount; i++) {
		presets[`route_source_${i}`] = {
			category: 'Route Source (Y)',
			label: 'Route ' + this.getInput(i).name + ' to selected destination',
			type: 'button',
			style: {
				text: '$(videohub:input_' + (i + 1) + ')',
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
						input: i,
					},
				},
				{
					feedbackId: 'take_tally_source',
					options: {
						bg: combineRgb(255, 0, 0),
						fg: combineRgb(255, 255, 255),
						input: i,
					},
				},
			],
			steps: [
				{
					down: [
						{
							actionId: 'route_source',
							options: {
								source: i,
							},
						},
					],
					up: [],
				},
			],
		}
	}

	for (let out = 0; out < this.outputCount + this.monitoringCount; out++) {
		for (let i = 0; i < this.inputCount; i++) {
			presets[`output_${out}_${i}`] = {
				category: 'Output ' + (out + 1),
				label: 'Output ' + (out + 1) + ' button for ' + this.getInput(i).name,
				type: 'button',
				style: {
					text: '$(videohub:input_' + (i + 1) + ')',
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
							input: i,
							output: out,
						},
					},
				],
				steps: [
					{
						down: [
							{
								actionId: 'route',
								options: {
									source: i,
									destination: out,
								},
							},
						],
						up: [],
					},
				],
			}

			presets[`output_${out}_${i}_momentary`] = {
				category: 'Output ' + (out + 1) + ' (momentary)',
				label: 'Output ' + (out + 1) + ' button for ' + this.getInput(i).name + ' with route back',
				type: 'button',
				style: {
					text: '$(videohub:input_' + (i + 1) + ') (mom.)',
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
							input: i,
							output: out,
						},
					},
				],
				steps: [
					{
						down: [
							{
								actionId: 'route',
								options: {
									source: i,
									destination: out,
								},
							},
						],
						up: [
							{
								actionId: 'route_to_previous',
								options: {
									destination: out,
								},
							},
						],
					},
				],
			}
		}
	}

	if (this.serialCount > 0) {
		for (let out = 0; out < this.serialCount; out++) {
			for (let i = 0; i < this.serialCount; i++) {
				if (i == out) {
					continue
				}

				presets[`serial_${out}`] = {
					category: 'Serial ' + (out + 1),
					label: 'Route serial ' + (i + 1) + ' to serial ' + (out + 1),
					type: 'button',
					style: {
						text: '$(videohub:serial_' + (i + 1) + ')',
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
								input: i,
								output: out,
							},
						},
					],
					steps: [
						{
							down: [
								{
									actionId: 'route_serial',
									options: {
										source: i,
										destination: out,
									},
								},
							],
							up: [],
						},
					],
				}
			}
		}
	}

	this.setPresetDefinitions(presets)
}
