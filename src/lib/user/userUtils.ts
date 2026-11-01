import { EquipmentSlot, type GearSetup, type GearSetupType } from '@oldschoolgg/gear';
import { cleanUsername } from '@oldschoolgg/toolkit';
import { isValidDiscordSnowflake } from '@oldschoolgg/util';
import { Bank, Items } from 'oldschooljs';

import { Gear } from '@/lib/structures/Gear.js';

export async function lookupUsernames(userIds: string[]): Promise<Map<string, string>> {
	const ids = [...new Set(userIds)];
	if (ids.some(id => !isValidDiscordSnowflake(id))) {
		throw new Error('Invalid userID');
	}
	if (ids.length === 0) return new Map();

	const usernames = new Map(ids.map(id => [id, 'Unknown']));
	const discordUsers = await roboChimpClient.discordUser.findMany({
		where: { id: { in: ids } },
		select: { id: true, username: true }
	});
	for (const user of discordUsers) {
		const username = user.username ? cleanUsername(user.username) : '';
		if (username) usernames.set(user.id, username);
	}
	return usernames;
}

export async function validateEquippedGear(user: MUser) {
	const itemsUnequippedAndRefunded = new Bank();
	for (const [gearSetupName, gear] of Object.entries(user.gear) as [GearSetupType, Gear][]) {
		if (!(gear instanceof Gear)) {
			throw new Error('Invalid gear instance, received: ' + typeof gear);
		}
		const gearSetup: GearSetup = gear.raw();
		if (gearSetup['2h'] !== null) {
			if (gearSetup.weapon?.item) {
				const { refundBank } = await user.forceUnequip(
					gearSetupName,
					EquipmentSlot.Weapon,
					'2h Already equipped'
				);
				itemsUnequippedAndRefunded.add(refundBank);
			}
			if (gearSetup.shield?.item) {
				const { refundBank } = await user.forceUnequip(
					gearSetupName,
					EquipmentSlot.Shield,
					'2h Already equipped'
				);
				itemsUnequippedAndRefunded.add(refundBank);
			}
		}
		for (const slot of Object.values(EquipmentSlot)) {
			const item = gearSetup[slot];
			if (!item) continue;
			const osItem = Items.get(item.item);
			if (!osItem) {
				const { refundBank } = await user.forceUnequip(gearSetupName, slot, 'Invalid item');
				itemsUnequippedAndRefunded.add(refundBank);
				continue;
			}
			if (osItem.equipment?.slot !== slot) {
				const { refundBank } = await user.forceUnequip(gearSetupName, slot, 'Wrong slot');
				itemsUnequippedAndRefunded.add(refundBank);
			}
			if (osItem.equipment?.requirements && !user.hasSkillReqs(osItem.equipment.requirements)) {
				const { refundBank } = await user.forceUnequip(gearSetupName, slot, 'Doesnt meet requirements');
				itemsUnequippedAndRefunded.add(refundBank);
			}
		}
	}
	return {
		itemsUnequippedAndRefunded
	};
}
