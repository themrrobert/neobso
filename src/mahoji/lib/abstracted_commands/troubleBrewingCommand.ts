import { Time } from '@oldschoolgg/toolkit';

import type { MinigameActivityTaskOptionsWithNoChanges } from '@/lib/types/minions.js';
import { formatTripDuration } from '@/lib/util/minionUtils.js';
import { speedCalculations } from '@/mahoji/lib/abstracted_commands/minionKill/timeAndSpeed.js';

export async function troubleBrewingStartCommand(user: MUser, channelId: string) {
	const speedResult = speedCalculations({ activity: 'TroubleBrewing', multiplier: 1 });
	const timePerGame = Time.Minute * 20 * speedResult.multiplier;
	const maxTripLength = await user.calcMaxTripLength('TroubleBrewing');
	const quantity = Math.floor(maxTripLength / timePerGame);
	const duration = quantity * timePerGame;

	await ActivityManager.startTrip<MinigameActivityTaskOptionsWithNoChanges>({
		quantity,
		userID: user.id,
		duration,
		type: 'TroubleBrewing',
		channelId,
		minigameID: 'trouble_brewing'
	});

	return `${user.minionName} is now doing ${quantity}x games of Trouble Brewing! It will take ${formatTripDuration(user, duration)} to finish.\n\n**Boosts:** ${speedResult.messages.join(', ')}`;
}
