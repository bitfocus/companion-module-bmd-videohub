import { Regex, SomeCompanionConfigField } from '@companion-module/base'

export interface VideoHubConfig {
	bonjourHost?: string
	host?: string
	take?: boolean

	inputCount?: number
	outputCount?: number
	monitoringCount?: number
	serialCount?: number
}

export function getConfigFields(): SomeCompanionConfigField[] {
	return [
		{
			type: 'static-text',
			id: 'info',
			width: 12,
			label: 'Information',
			value: 'This module will connect to any Blackmagic Design VideoHub Device.',
		},
		{
			type: 'bonjour-device',
			id: 'bonjourHost',
			label: 'Device',
			width: 6,
		},
		{
			type: 'static-text',
			id: 'bonjourHost-filler',
			width: 6,
			label: '',
			value: '',
			isVisible: (options) => !!options['bonjourHost'],
		},
		{
			type: 'textinput',
			id: 'host',
			label: 'Videohub IP',
			width: 6,
			default: '192.168.10.150',
			regex: Regex.IP,
			isVisible: (options) => !options['bonjourHost'],
		},
		{
			type: 'checkbox',
			id: 'take',
			label: 'Enable Take? (XY only)',
			width: 6,
			default: false,
		},
		{
			type: 'static-text',
			id: 'info',
			width: 12,
			label: 'Information',
			value:
				'The counts below will automatically populate from the device upon connection, however, they can be set manually for offline programming.',
		},
		{
			type: 'number',
			id: 'inputCount',
			label: 'Input Count',
			default: 12,
			width: 3,
			min: 0,
			max: 288,
		},
		{
			type: 'number',
			id: 'outputCount',
			label: 'Output Count',
			default: 12,
			width: 3,
			min: 0,
			max: 288,
		},
		{
			type: 'number',
			id: 'monitoringCount',
			label: 'Monitoring Output Count (when present)',
			default: 0,
			width: 3,
			min: 0,
			max: 288,
		},
		{
			type: 'number',
			id: 'serialCount',
			label: 'Serial Port Count (when present)',
			default: 0,
			width: 3,
			min: 0,
			max: 288,
		},
	]
}
