import { type HeadKey } from '@/lib/canvas/chatHeadImage.js';

import { noOp, Time } from '@oldschoolgg/toolkit';
import { Bank, LootTable } from 'oldschooljs';

export const Halloween2026LootTable = new LootTable()
	.oneIn(50, 'Cob')
	.oneIn(6, 'Halloween cracker')
	.add('Human tooth')
	.add('Human blood')
	.add('Sliced femur')
	.add('Human appendage');

const halloween2026Heads: HeadKey[] = ['polterpup', 'agatha', 'unknownVampire'];

const treatMessages = [
	'I saved something special for you in my pumpkin patch.',
	'I stirred this up especially for you. Do not ask what is in it.',
	'I found this rattling around in my coffin. It is yours now.',
	'I slipped this out of the mist just for you. Hold it tight.',
	'I reached through the fog to bring you a little something.'
];

const trickMessages = [
	'I borrowed your shadow. Do not worry, I put it back.',
	'I made all the torches go out. Did I frighten you?',
	'I asked a skeleton to borrow your boot. It came back... mostly.',
	'I can see you have forgotten something. How delicious.',
	'I sent a black cat to judge your outfit. It was very thorough.'
];

const cobMessages = [
	'I flew all night to find you. Will you take me home with you?',
	'I chose you, human. Your shoulder looks like the perfect roost.'
];

export function isHalloween2026Active(date = new Date()): boolean {
	return date >= new Date('2026-10-01T00:00:00.000Z') && date < new Date('2026-11-10T00:00:00.000Z');
}

export async function handleHalloween2026TripFinish({
	channelId,
	duration,
	rng,
	user
}: {
	channelId: string;
	duration: number;
	rng: RNGProvider;
	user: MUser;
}) {
	if (!isHalloween2026Active()) return;

	const minutes = Math.floor(duration / Time.Minute);
	for (let minute = 0; minute < minutes; minute++) {
		if (!rng.roll(1000)) continue;
		await user.addItemsToBank({ items: new Bank().add('Cob'), collectionLog: true });
		await globalClient
			.sendDm(
				user.id,
				new MessageBuilder().addChatHeadImage('unknownVampire', rng.pick(cobMessages))
			)
			.catch(noOp);
		return;
	}

	for (let minute = 0; minute < minutes; minute++) {
		if (!rng.roll(500)) continue;

		const head = rng.pick(halloween2026Heads);
		if (rng.roll(2)) {
			await globalClient.sendMessageOrWebhook(
				channelId,
				new MessageBuilder().addChatHeadImage(head, `Trick! ${rng.pick(trickMessages)}`)
			);
		} else {
			const loot = Halloween2026LootTable.roll();
			await user.addItemsToBank({ items: loot, collectionLog: true });
			await globalClient.sendMessageOrWebhook(
				channelId,
				new MessageBuilder().addChatHeadImage(head, `Treat! ${rng.pick(treatMessages)} I brought you ${loot}.`)
			);
		}
		break;
	}
}
