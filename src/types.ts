import type { InstanceBase, TCPHelper } from '@companion-module/base'
import type { VideoHubConfig } from './config.js'
import type { VideohubState } from './state.js'

export interface InstanceBaseExt extends InstanceBase<VideoHubConfig> {
	readonly state: VideohubState

	config: VideoHubConfig

	socket: TCPHelper | undefined

	init_tcp(): void

	initThings(includeVariables: boolean): void
}

export interface IpAndPort {
	ip: string
	port: number | undefined
}
