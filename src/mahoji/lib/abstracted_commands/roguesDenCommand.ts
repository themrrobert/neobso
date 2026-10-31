import { formatDuration, reduceNumByPercent, Time } from '@oldschoolgg/toolkit';
import { Bank } from 'oldschooljs';

import type { RoguesDenMazeActivityTaskOptions } from '@/lib/types/minions.js';
import { formatTripDuration } from '@/lib/util/minionUtils.js';

export async function roguesDenCommand(user: MUser, channelId: string, inputQuantity?: number) {
	if (await user.minionIsBusy()) return `${user.minionName} is busy.`;
	if (user.skillsAsLevels.agility < 50 || user.skillsAsLevels.thieving < 50) {
		return "To attempt the Rogues' Den maze you need 50 Agility and 50 Thieving.";
	}

	const staminasToRemove = new Bank();
	const boosts = [];
	let baseTime = Time.Minute * 9;

	let skillPercentage = (user.skillsAsLevels.agility + user.skillsAsLevels.thieving) / 20;
	boosts.push(`${skillPercentage}% boost for levels`);

	if (user.skillsAsLevels.thieving >= 80) {
		skillPercentage += 40;
		boosts.push('40% boost for 80+ Thieving');
	}

	baseTime = reduceNumByPercent(baseTime, skillPercentage);

	const maxTripLength = await user.calcMaxTripLength('RoguesDenMaze');
	let maxQuantity = Math.floor(maxTripLength / baseTime);
	const hasStaminaPotions = user.hasEquippedOrInBank('Stamina potion(4)');

	if (hasStaminaPotions) {
		baseTime = reduceNumByPercent(baseTime, 50);

		const potionsInBank = user.bank.amount('Stamina potion(4)');
		const maxPossibleLaps = Math.floor(maxTripLength / baseTime);

		// do as many laps as possible with the current stamina potion supply
		maxQuantity = Math.min(potionsInBank * 4, maxPossibleLaps);
	} else {
		boosts.push('-50% not enough Stamina potions');
	}

	if (inputQuantity && inputQuantity > maxQuantity) {
		return `${user.minionName} can't complete more than ${maxQuantity}x Rogues' Den laps in one trip.`;
	}

	const quantity = inputQuantity ?? maxQuantity;
	if (hasStaminaPotions) {
		staminasToRemove.add('Stamina potion(4)', Math.ceil(quantity / 4));
	}

	const duration = quantity * baseTime;

	if (staminasToRemove.length > 0) {
		await user.removeItemsFromBank(staminasToRemove);
		await ClientSettings.updateBankSetting('rogues_den_cost', staminasToRemove);
	}

	await ActivityManager.startTrip<RoguesDenMazeActivityTaskOptions>({
		userID: user.id,
		channelId,
		quantity,
		iQty: inputQuantity,
		duration,
		minigameID: 'rogues_den',
		type: 'RoguesDenMaze'
	});

	let str = `${
		user.minionName
	} is now off to complete the Rogues' Den maze ${quantity}x times, their trip will return in about ${formatTripDuration(user, duration)} (${formatDuration(baseTime)} per lap).`;

	if (staminasToRemove.length > 0) {
		str += ` Removed ${staminasToRemove} from your bank.`;
	}

	if (boosts.length > 0) {
		str += `\n\n**Boosts:** ${boosts.join(', ')}.`;
	}
	return str;
}
