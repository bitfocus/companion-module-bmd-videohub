import type { InstanceBase, TCPHelper } from '@companion-module/base'
import { VideoHubConfig } from './config.js'

export interface InstanceBaseExt extends InstanceBase<VideoHubConfig> {
	config: VideoHubConfig

	socket: TCPHelper | undefined

	init_tcp(): void
}
