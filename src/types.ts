import type { InstanceBase, TCPHelper } from '@companion-module/base'
import type { VideoHubConfig } from './config.js'
import type { VideohubState } from './state.js'
import type { ActionsSchema } from './actions.js'
import type { FeedbackSchema } from './feedback.js'
import type { VariablesSchema } from './variables.js'

export interface VideohubTypes {
	config: VideoHubConfig
	secrets: undefined
	actions: ActionsSchema
	feedbacks: FeedbackSchema
	variables: VariablesSchema
}

export interface InstanceBaseExt extends InstanceBase<VideohubTypes> {
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
