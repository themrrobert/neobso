import { syncDoubleLoot } from '@/lib/bso/doubleLoot.js';
import { syncSlayerMaskLeaderboardCache } from '@/lib/bso/skills/slayer/slayerMaskLeaderboard.js';

import { Time } from '@oldschoolgg/toolkit';
import { TimerManager } from '@sapphire/timer-manager';

import { bulkUpdateCommands } from '@/discord/utils.js';
import { Channel, globalConfig, META_CONSTANTS } from '@/lib/constants.js';
import { initTickers } from '@/lib/tickers.js';

export const onStartup = async () => {
	await syncDoubleLoot();
	syncSlayerMaskLeaderboardCache();

	// Wait 10 seconds before starting tickers to reduce lag on startup
	TimerManager.setTimeout(
		() => {
			initTickers();
		},
		globalConfig.isProduction ? Time.Second * 10 : 0
	);

	const silentStartupMessage =
		process.env.SILENT !== undefined &&
		process.env.SILENT.toLowerCase() !== 'false' &&
		Number(process.env.SILENT) !== 0;

	if (globalConfig.isProduction) {
		if (!silentStartupMessage) {
			globalClient
				.sendMessage(Channel.GeneralChannel, {
					content: `I have just turned on!\n\n${META_CONSTANTS.RENDERED_STR}`
				})
				.catch(err => Logging.logError(err));
		}
	} else {
		// In development, always sync commands on startup.
		await bulkUpdateCommands();
	}
};
