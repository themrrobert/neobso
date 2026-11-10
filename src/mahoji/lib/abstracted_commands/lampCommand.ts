import { ButtonBuilder, ButtonStyle, collectSingleInteraction, SpecialResponse } from '@oldschoolgg/discord';
import { getNextUTCReset, sleep, Time } from '@oldschoolgg/toolkit';
import { Bank, type Item, type ItemBank, Items, itemID, resolveItems } from 'oldschooljs';
import { clamp } from 'remeda';

import type { MessageBuilderClass } from '@/discord/MessageBuilder.js';
import { JibUhmzHeads } from '@/lib/canvas/chatHeadImage.js';
import jibUhmzData from '@/lib/resources/jibumhz.json' with { type: 'json' };
import { type SkillNameType, SkillsArray } from '@/lib/skilling/types.js';
import type { Skills } from '@/lib/types/index.js';
import { assert } from '@/lib/util/logError.js';
import { isValidSkill } from '@/lib/util/smallUtils.js';

interface IXPLamp {
	itemID: number;
	amount: number;
	name: string;
	minimumLevel: number;
	allowedSkills?: SkillNameType[];
}

export const customLampIDs = new Set(resolveItems(['Small lamp', 'Average lamp', 'Large lamp', 'Huge lamp']));

export const XPLamps: IXPLamp[] = [
	{
		itemID: 11_137,
		amount: 2500,
		name: 'Antique lamp 1',
		minimumLevel: 1
	},
	{
		itemID: 11_139,
		amount: 7500,
		name: 'Antique lamp 2',
		minimumLevel: 30
	},
	{
		itemID: 11_141,
		amount: 15_000,
		name: 'Antique lamp 3',
		minimumLevel: 40
	},
	{
		itemID: 11_185,
		amount: 50_000,
		name: 'Antique lamp 4',
		minimumLevel: 70
	},
	{
		itemID: 28_409,
		amount: 100_000,
		name: 'Ancient lamp',
		minimumLevel: 60,
		allowedSkills: ['attack', 'strength', 'defence', 'hitpoints', 'ranged', 'magic', 'prayer']
	},
	// BSO Lamps
	{
		itemID: 6796,
		amount: 20_000,
		name: 'Tiny lamp',
		minimumLevel: 1
	},
	{
		itemID: 21_642,
		amount: 50_000,
		name: 'Small lamp',
		minimumLevel: 1
	},
	{
		itemID: 23_516,
		amount: 100_000,
		name: 'Average lamp',
		minimumLevel: 1
	},
	{
		itemID: 22_320,
		amount: 1_000_000,
		name: 'Large lamp',
		minimumLevel: 1
	},
	{
		itemID: 11_157,
		amount: 5_000_000,
		name: 'Huge lamp',
		minimumLevel: 1
	},
	{
		itemID: 28_587,
		amount: 30_000,
		name: 'Magic lamp (strength)',
		minimumLevel: 1,
		allowedSkills: ['strength']
	},
	{
		itemID: 28_588,
		amount: 20_000,
		name: 'Magic lamp (slayer)',
		minimumLevel: 1,
		allowedSkills: ['slayer']
	},
	{
		itemID: 28_589,
		amount: 5000,
		name: 'Magic lamp (thieving)',
		minimumLevel: 1,
		allowedSkills: ['thieving']
	},
	{
		itemID: 28_590,
		amount: 500,
		name: 'Magic lamp (magic)',
		minimumLevel: 1,
		allowedSkills: ['magic']
	},
	{
		itemID: 28_820,
		amount: 5000,
		name: 'Antique lamp (defender of varrock)',
		minimumLevel: 1
	},
	{
		itemID: itemID('Antique lamp (easy ca)'),
		amount: 5000,
		name: 'Antique lamp (easy ca)',
		minimumLevel: 20
	},
	{
		itemID: itemID('Antique lamp (medium ca)'),
		amount: 10_000,
		name: 'Antique lamp (medium ca)',
		minimumLevel: 30
	},
	{
		itemID: itemID('Antique lamp (hard ca)'),
		amount: 15_000,
		name: 'Antique lamp (hard ca)',
		minimumLevel: 40
	},
	{
		itemID: itemID('Antique lamp (elite ca)'),
		amount: 25_000,
		name: 'Antique lamp (elite ca)',
		minimumLevel: 50
	},
	{
		itemID: itemID('Antique lamp (master ca)'),
		amount: 35_000,
		name: 'Antique lamp (master ca)',
		minimumLevel: 60
	},
	{
		itemID: itemID('Antique lamp (grandmaster ca)'),
		amount: 50_000,
		name: 'Antique lamp (grandmaster ca)',
		minimumLevel: 70
	}
];

interface IFunctionData {
	user: MUser;
	item: Item;
	quantity: number;
}

interface IXPObject {
	items: number[];
	function: (data: IFunctionData) => [Skills, Skills | undefined];
}

export const Lampables: IXPObject[] = [
	{
		items: resolveItems(['Dark relic']),
		function: data => {
			const skills: Skills = {};
			for (const skill of SkillsArray) {
				skills[skill] =
					data.user.skillLevel(skill) *
					([
						'attack',
						'strength',
						'defence',
						'magic',
						'ranged',
						'hitpoints',
						'prayer',
						'mining',
						'woodcutting',
						'herblore',
						'farming',
						'hunter',
						'cooking',
						'fishing',
						'thieving',
						'firemaking',
						'agility',
						'dungeoneering'
					].includes(skill)
						? 150
						: 50) *
					data.quantity;
			}
			return [skills, undefined];
		}
	},
	{
		items: resolveItems(['Genie lamp']),
		function: data => {
			const skills: Skills = {};
			for (const skill of SkillsArray) {
				skills[skill] = data.user.skillLevel(skill) * 10 * data.quantity;
			}
			return [skills, undefined];
		}
	},
	{
		items: resolveItems(['Book of knowledge']),
		function: data => {
			const skills: Skills = {};
			for (const skill of SkillsArray) {
				skills[skill] = data.user.skillLevel(skill) * 15 * data.quantity;
			}
			return [skills, undefined];
		}
	},
	{
		items: XPLamps.map(i => i.itemID),
		function: data => {
			const lamp = XPLamps.find(l => l.itemID === data.item.id)!;
			const skills: Skills = {};
			const requirements: Skills = {};
			for (const skill of SkillsArray) {
				if (lamp.allowedSkills && !lamp.allowedSkills.includes(skill)) continue;
				skills[skill] = lamp.amount * data.quantity;
				requirements[skill] = lamp.minimumLevel;
			}
			return [skills, requirements];
		}
	},
	{
		items: resolveItems(['Book of arcane knowledge']),
		function: data => {
			const skills: Skills = {};
			for (const skill of SkillsArray) {
				if (skill !== 'magic' && skill !== 'runecraft') {
					continue;
				}
				skills[skill] = data.user.skillLevel(skill) * (['magic'].includes(skill) ? 15 : 5) * data.quantity;
			}
			return [skills, undefined];
		}
	},
	{
		items: resolveItems(['Training manual']),
		function: data => {
			const skills: Skills = {};
			for (const skill of SkillsArray) {
				if (!['attack', 'strength', 'defence', 'hitpoints'].includes(skill)) {
					continue;
				}
				skills[skill] =
					Math.round(Number(Math.pow(data.user.skillLevel(skill), 2)) / 4 + 7 * data.user.skillLevel(skill)) *
					data.quantity;
			}
			return [skills, undefined];
		}
	},
	{
		items: resolveItems(["Duradel's Notes"]),
		function: data => {
			const skills: Skills = {};
			for (const skill of SkillsArray) {
				if (!['slayer'].includes(skill)) {
					continue;
				}
				skills[skill] = data.user.skillLevel(skill) * 15 * data.quantity;
			}
			return [skills, undefined];
		}
	},
	{
		items: resolveItems(['Antique lamp (Historian Aldo)']),
		function: data => {
			const skills: Skills = {};

			for (const skill of SkillsArray) {
				if (!['attack', 'strength', 'defence', 'hitpoints', 'ranged', 'magic', 'prayer'].includes(skill)) {
					continue;
				}

				skills[skill] = (skill === 'prayer' ? 3500 : 5000) * data.quantity;
			}
			return [skills, undefined];
		}
	}
];

export async function lampCommand(
	interaction: MInteraction,
	user: MUser,
	itemToUse: string,
	skill: string,
	_quantity: number | undefined
) {
	if (_quantity !== undefined && (!Number.isSafeInteger(_quantity) || _quantity < 1)) {
		return 'Quantity must be a positive whole number.';
	}

	const item = Items.getItem(itemToUse);
	if (!item) return "That's not a valid item.";

	const xpObject = Lampables.find(x => x.items.includes(item.id));
	if (!xpObject) return "That's not a valid item to use.";

	if (!isValidSkill(skill)) return "That's not a valid skill.";

	const qty = !_quantity ? 1 : clamp(_quantity, { min: 1, max: 1000 });
	const toRemoveFromBank = new Bank().add(item.id, qty);

	let skillsToReceive: Skills = {};
	let skillsRequirements: Skills | undefined;

	[skillsToReceive, skillsRequirements] = xpObject.function({
		user,
		quantity: qty,
		item
	});

	if (!skillsToReceive[skill] || !isValidSkill(skill)) {
		return 'This is not a valid skill for this item.';
	}

	if (skillsRequirements && user.skillLevel(skill) < skillsRequirements[skill]!) {
		return `You are not skilled enough to receive this reward. You need level **${skillsRequirements[
			skill
		]!}** in ${skill} to receive it.`;
	}

	const requestedAmount = skillsToReceive[skill]!;
	assert(typeof requestedAmount === 'number' && requestedAmount > 0);

	return user.withLock('lamp', async lockedUser => {
		if (!lockedUser.owns(toRemoveFromBank)) {
			return `You don't have **${toRemoveFromBank}** in your bank.`;
		}

		const { max_daily_lamp_xp: maxDailyLampXP } = await ClientSettings.fetch({ max_daily_lamp_xp: true });
		if (maxDailyLampXP === -1 && customLampIDs.has(item.id)) {
			return 'Custom lamps are currently disabled.';
		}

		const stats = await lockedUser.fetchStats();
		const lastLampedTimestamp = stats.last_lamped_date.getTime();
		const nextReset = getNextUTCReset(lastLampedTimestamp, Time.Day);
		const isNewUTCDay = Date.now() >= nextReset;
		const dailyLampedXP = isNewUTCDay ? 0 : stats.daily_lamped_xp;
		const remainingXP = maxDailyLampXP > 0 ? Math.max(maxDailyLampXP - dailyLampedXP, 0) : null;
		const amount = remainingXP === null ? requestedAmount : Math.min(requestedAmount, remainingXP);

		if (amount === 0) {
			const resetTimestamp = Math.floor(nextReset / 1000);
			return `You have reached your daily lamp XP limit of **${maxDailyLampXP.toLocaleString()} XP**. It will reset at 00:00 UTC (<t:${resetTimestamp}:R>).`;
		}

		if (amount < requestedAmount) {
			await interaction.confirmation(
				`${user}, this lamp is worth **${requestedAmount.toLocaleString()} XP**, but you will receive only **${amount.toLocaleString()} XP** due to your daily limit. Use it anyway?`
			);
		}

		const newLampedXp = {
			...(stats.lamped_xp as ItemBank)
		};
		if (!newLampedXp[skill]) newLampedXp[skill] = amount;
		else newLampedXp[skill] += amount;
		await lockedUser.statsUpdate({
			lamped_xp: newLampedXp,
			daily_lamped_xp: dailyLampedXP + amount,
			last_lamped_date: new Date()
		});

		await lockedUser.removeItemsFromBank(toRemoveFromBank);
		const xpStr = await lockedUser.addXP({ skillName: skill, amount, artificial: true, multiplier: false });
		const remainingMessage =
			remainingXP === null
				? ''
				: `\n\nYou have ${Math.max(remainingXP - amount, 0).toLocaleString()}/${maxDailyLampXP.toLocaleString()} XP Remaining before your Daily Limit`;

		return { content: `You used ${toRemoveFromBank}. ${xpStr}${remainingMessage}` };
	});
}

const jibTactics: JibTactic[] = ['aggressively', 'sweetly', 'cowardly'];
type JibTactic = 'aggressively' | 'sweetly' | 'cowardly';

interface JibTemplateContext {
	cost: Bank;
	lamp: Item;
	loot: Bank;
	countSequence?: number[];
}

const jibNumberWords: Record<number, string[]> = {
	1: ['wan', 'one', '1'],
	2: ['too', 'two', '2'],
	3: ['free', 'three', '3'],
	4: ['four', '4'],
	5: ['fiv', 'five', '5'],
	6: ['sikx', 'six', '6'],
	7: ['sevin', 'seven', '7'],
	8: ['ate', 'eight', '8'],
	9: ['nien', 'nine', '9']
};

function jibLampCount(bank: Bank) {
	return bank.items().reduce((total, [, quantity]) => total + quantity, 0);
}

function makeBrokenCountSequence(rng: RNGProvider, quantity: number) {
	if (quantity === 0) return [];
	const first = rng.pick([1, 2, 3, 4, 5, 6]);
	const sequence = [first];
	if (quantity > 1) sequence.push(Math.min(first + 1, 9));
	if (quantity > 2) sequence.push(rng.pick([first, Math.max(first - 1, 1), Math.min(first + 3, 9)]));
	while (sequence.length < quantity) {
		sequence.push(rng.pick([1, 2, 3, 4, 5, 6, 7, 8, 9]));
	}
	return sequence;
}

function randomJibTemplateValue(rng: RNGProvider, key: string) {
	const values = (jibUhmzData.templateValues as Record<string, string[]>)[key];
	return values ? rng.pick(values) : `{${key}}`;
}

function renderJibTemplate(rng: RNGProvider, template: string, context: JibTemplateContext) {
	let numberIndex = 0;
	return template
		.replace(/\{#(LOOT|COST|\d+)?\}/g, (_match, token: string | undefined) => {
			if (token === 'LOOT') return jibLampCount(context.loot).toString();
			if (token === 'COST') return jibLampCount(context.cost).toString();

			const number = token
				? Number(token)
				: (context.countSequence?.[numberIndex] ?? rng.pick([1, 2, 3, 4, 5, 6, 7, 8, 9]));
			const choices = jibNumberWords[number]!;
			const result =
				numberIndex === 0
					? rng.pick(choices.filter(choice => choice !== number.toString()))
					: numberIndex === 1
						? number.toString()
						: rng.pick(choices);
			numberIndex++;
			return result;
		})
		.replace(/\{(?:A|AN)#([A-Z_]+)\}/g, (_match, key: string) => {
			const value = randomJibTemplateValue(rng, key);
			return `${/^[aeiou]/i.test(value) ? 'an' : 'a'} ${value}`;
		})
		.replace(/\{([A-Z_]+)\}/g, (_match, key: string) => {
			if (key === 'COST') return context.cost.toString();
			if (key === 'LAMP') return context.lamp.name;
			return randomJibTemplateValue(rng, key);
		});
}

function jibPayout(targetXP: number) {
	const lampOptions = XPLamps.filter(lamp => customLampIDs.has(lamp.itemID)).sort((a, b) => b.amount - a.amount);
	const loot = new Bank();
	let remainingXP = targetXP;
	for (const lamp of lampOptions) {
		const quantity = Math.floor(remainingXP / lamp.amount);
		if (quantity === 0) continue;
		loot.add(lamp.itemID, quantity);
		remainingXP -= quantity * lamp.amount;
	}
	return loot;
}

function jibOffer(rng: RNGProvider, tactic: JibTactic, lamp: Item) {
	const tacticData = jibUhmzData.tactics[tactic];
	const opening = rng.pick(jibUhmzData.openingMessages.filter(message => message.tactic === tactic));
	const context: JibTemplateContext = {
		cost: new Bank().add(lamp.id),
		lamp,
		loot: new Bank()
	};
	const speech = renderJibTemplate(
		rng,
		opening.template
			.replaceAll('{FRUIT}', rng.pick(tacticData.fruits))
			.replaceAll('{PLACE}', rng.pick(tacticData.places)),
		context
	);
	const adjective = randomJibTemplateValue(rng, 'ADJECTIVE');
	const adverb = randomJibTemplateValue(rng, 'ADVERB');

	return {
		head: rng.pick(JibUhmzHeads),
		headContent: `${speech} Bring me your precious ${lamp.name}.`,
		content: `*The game ${adverb} tells you something cool about ${/^[aeiou]/i.test(adjective) ? 'an' : 'a'} ${adjective} goblin. You can see the words “Jib Uhmz” scratched into his grimy grimer.*\n\nJust as you are about to leave, a much shorter goblin pops out of a crack you did not know was there, clutching a suspicious counting stick. He insists his height has nothing to do with this.\n\n“You approach cautiously, but without fear. Your ${lamp.name} is held tight and out of sight. If you proceed, you will have no choice but to accept his offer.....”\n\nDo you want to trade your ${lamp.name} to Jib Uhmz? You know he only pays 80%, but he also can't count. You are **definitely** going to get ripped off. How do you want to play this?`
	};
}

async function chooseJibTactic(interaction: MInteraction, user: MUser, offer: ReturnType<typeof jibOffer>) {
	const buttons = [
		new ButtonBuilder().setCustomId('JIB_UHMZ_AGGRESSIVELY').setLabel('Aggressively').setStyle(ButtonStyle.Primary),
		new ButtonBuilder().setCustomId('JIB_UHMZ_SWEETLY').setLabel('Sweetly').setStyle(ButtonStyle.Success),
		new ButtonBuilder().setCustomId('JIB_UHMZ_COWARDLY').setLabel('Cowardly').setStyle(ButtonStyle.Secondary),
		new ButtonBuilder().setCustomId('JIB_UHMZ_RUN').setLabel('Run!').setStyle(ButtonStyle.Danger)
	];

	await interaction.defer();
	const response = await interaction.replyWithResponse(
		await new MessageBuilder()
			.setContent(offer.content)
			.addChatHeadImage(offer.head, offer.headContent)
			.addComponents(buttons)
			.build()
	);
	if (!response) return null;

	const picked = await collectSingleInteraction({
		interaction,
		messageId: response.message_id,
		channelId: interaction.channelId,
		users: [user.id],
		timeoutMs: Time.Second * 30
	});
	if (!picked) return null;
	await picked.silentButtonAck();

	const tacticsByButton: Record<string, JibTactic | 'run'> = {
		JIB_UHMZ_AGGRESSIVELY: 'aggressively',
		JIB_UHMZ_SWEETLY: 'sweetly',
		JIB_UHMZ_COWARDLY: 'cowardly',
		JIB_UHMZ_RUN: 'run'
	};
	return tacticsByButton[picked.customId!] ?? null;
}

type JibUhmzDelayMode = 0 | 1 | 2;

async function getJibUhmzDelayMode(): Promise<JibUhmzDelayMode> {
	const clientSettings = await ClientSettings.fetch({ extraSettings: true });
	const delayMode = (clientSettings.extraSettings as Record<string, unknown> | null)?.jibuhmzDelayMode;
	return delayMode === 1 || delayMode === 2 ? delayMode : 0;
}

function jibTradeResultMessage({
	user,
	tactic,
	context,
	payoutSpeech,
	rng
}: {
	user: MUser;
	tactic: JibTactic;
	context: JibTemplateContext;
	payoutSpeech: string;
	rng: RNGProvider;
}) {
	return new MessageBuilder()
		.setContent(
			`${user} ${tactic} negotiated with Jib Uhmz, offering ${context.cost} and receiving ${context.loot} in return.`
		)
		.addChatHeadImage(rng.pick(JibUhmzHeads), payoutSpeech);
}

async function sendJibDelayedCounting({
	context,
	delayMode,
	interaction,
	rng,
	tradeResult
}: {
	context: JibTemplateContext;
	delayMode: JibUhmzDelayMode;
	interaction: MInteraction;
	rng: RNGProvider;
	tradeResult: MessageBuilderClass;
}) {
	if (!rng.roll(10)) return false;

	const lines = rng.pick(jibUhmzData.delayedCountingMessages);
	const joined = lines.join('\u0000');
	const countTokenQuantity = (joined.match(/\{#\}/g) ?? []).length;
	const content = renderJibTemplate(rng, joined, {
		...context,
		countSequence: makeBrokenCountSequence(rng, countTokenQuantity)
	}).split('\u0000');

	const firstDelay = rng.pick([3, 4, 5, 6]) * Time.Second;
	const secondDelay = rng.pick([5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]) * Time.Second;

	if (delayMode === 0) {
		await interaction.followUp(new MessageBuilder().addChatHeadImage(rng.pick(JibUhmzHeads), content[0]));
		await sleep(firstDelay);
		await interaction.followUp(new MessageBuilder().addChatHeadImage(rng.pick(JibUhmzHeads), content[1]));
		await sleep(secondDelay);
		await interaction.followUp(new MessageBuilder().addChatHeadImage(rng.pick(JibUhmzHeads), content[2]));
		await interaction.followUp(tradeResult);
		return true;
	}

	const followUp = await interaction.followUp({ content: content[0] });
	await sleep(firstDelay);
	await interaction.editFollowUp(followUp.id, { content: content[1] });
	await sleep(secondDelay);
	await interaction.editFollowUp(followUp.id, { content: content[2] });

	if (delayMode === 1) {
		await interaction.followUp(tradeResult);
	} else {
		await interaction.editFollowUp(followUp.id, tradeResult);
	}
	return true;
}

export async function jibUhmzTradeCommand({
	interaction,
	itemToTrade,
	rng,
	user
}: {
	interaction: MInteraction;
	itemToTrade: string;
	rng: RNGProvider;
	user: MUser;
}): Promise<CommandResponse> {
	const lamp = Items.getItem(itemToTrade);
	if (!lamp || !customLampIDs.has(lamp.id)) {
		return 'Jib Uhmz only trades Small, Average, Large, and Huge lamps.';
	}

	if (!user.owns(new Bank().add(lamp.id))) {
		return `You don't have a ${lamp.name} in your bank.`;
	}

	const tactic = await chooseJibTactic(interaction, user, jibOffer(rng, rng.pick(jibTactics), lamp));
	if (!tactic) {
		await interaction.followUp({ content: 'Jib Uhmz loses interest and vanishes back into his crack.' });
		return SpecialResponse.RespondedManually;
	}
	if (tactic === 'run') {
		await interaction.followUp({
			content: 'You run. Jib Uhmz hisses about his precious lamps from somewhere behind the wall.'
		});
		return SpecialResponse.RespondedManually;
	}

	const delayMode = await getJibUhmzDelayMode();
	const trade = await user.withLock('jibuhmz_trade', async lockedUser => {
		const cost = new Bank().add(lamp.id);
		if (!lockedUser.owns(cost)) return null;

		const lampValue = XPLamps.find(xpLamp => xpLamp.itemID === lamp.id)!.amount;
		let payoutValue = Math.floor(lampValue * 0.85);
		if (tactic !== jibUhmzData.bestTactic) {
			if (rng.roll(3)) payoutValue = Math.floor(payoutValue * 0.9);
			if (rng.roll(10)) payoutValue = Math.floor(payoutValue * 0.85);
		}

		const loot = jibPayout(payoutValue);
		await lockedUser.removeItemsFromBank(cost);
		await lockedUser.addItemsToBank({ items: loot });
		await lockedUser.statsBankUpdate('jibuhmz_input', cost);
		await lockedUser.statsBankUpdate('jibuhmz_output', loot);

		const context: JibTemplateContext = { cost, lamp, loot };
		const payoutSpeech = renderJibTemplate(rng, rng.pick(jibUhmzData.payoutMessages), context);
		return { context, payoutSpeech, user: lockedUser };
	});
	if (!trade) {
		await interaction.followUp({ content: `You don't have a ${lamp.name} in your bank anymore.` });
		return SpecialResponse.RespondedManually;
	}

	const tradeResult = jibTradeResultMessage({ ...trade, tactic, rng });
	const delayed = await sendJibDelayedCounting({
		context: trade.context,
		delayMode,
		interaction,
		rng,
		tradeResult
	});
	if (!delayed) await interaction.followUp(tradeResult);
	return SpecialResponse.RespondedManually;
}
