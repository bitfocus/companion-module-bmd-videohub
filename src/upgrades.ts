import { CompanionStaticUpgradeScript, CreateConvertToBooleanFeedbackUpgradeScript } from '@companion-module/base'
import { VideoHubConfig } from './config'

export const UpgradeScripts: CompanionStaticUpgradeScript<VideoHubConfig>[] = [
	CreateConvertToBooleanFeedbackUpgradeScript({
		input_bg: true,
		serial_bg: true,
		selected_destination: true,
		selected_source: true,
		take: true,
		take_tally_source: true,
		take_tally_dest: true,
	}),
]
