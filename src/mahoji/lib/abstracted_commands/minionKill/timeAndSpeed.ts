import {
	calcWhatPercent,
	increaseNumByPercent,
	isObject,
	reduceNumByPercent,
	round,
	sumArr
} from '@oldschoolgg/toolkit';
import { Bank } from 'oldschooljs';
import { mergeDeep } from 'remeda';
import * as z from 'zod';

import { activity_type_enum } from '@/prisma/main/enums.js';
import { SlayerActivityConstants } from '@/lib/minions/data/combatConstants.js';
import { type AttackStyles, getAttackStylesContext } from '@/lib/minions/functions/index.js';
import reducedTimeFromKC from '@/lib/minions/functions/reducedTimeFromKC.js';
import type { Consumable } from '@/lib/minions/types.js';
import { ChargeBank } from '@/lib/structures/Bank.js';
import { UpdateBank } from '@/lib/structures/UpdateBank.js';
import type { SkillsRequired } from '@/lib/types/index.js';
import { getItemCostFromConsumables } from '@/mahoji/lib/abstracted_commands/minionKill/handleConsumables.js';
import {
	type BoostArgs,
	type BoostResult,
	type CombatMethodOptions,
	mainBoostEffects
} from '@/mahoji/lib/abstracted_commands/minionKill/speedBoosts.js';

export const CombatMethodOptionsSchema = z.object({
	bob: z.nativeEnum(SlayerActivityConstants).optional(),
	usingCannon: z.boolean().optional(),
	cannonMulti: z.boolean().optional(),
	chinning: z.boolean().optional(),
	hasWildySupplies: z.boolean().optional(),
	died: z.boolean().optional(),
	pkEncounters: z.number().int().min(0).optional(),
	isInWilderness: z.boolean().optional()
});

const schema = z.object({
	timeToFinish: z.number().int().positive(),
	messages: z.array(z.string()),
	currentTaskOptions: CombatMethodOptionsSchema,
	finalQuantity: z.number().int().positive().min(1),
	confirmations: z.array(z.string()),
	updateBank: z.instanceof(UpdateBank)
});

function applySkillBoost(skillsAsLevels: SkillsRequired, duration: number, styles: AttackStyles[]): [number, string] {
	const skillTotal = sumArr(styles.map(s => skillsAsLevels[s]));
	let newDuration = duration;
	let str = '';
	let percent = round(calcWhatPercent(skillTotal, styles.length * 99), 2);
	if (percent < 50) {
		percent = 50 - percent;
		newDuration = increaseNumByPercent(newDuration, percent);
		str = `-${percent.toFixed(2)}% for low stats`;
	} else {
		percent = Math.min(15, percent / 6.5);
		newDuration = reduceNumByPercent(newDuration, percent);
		str = `${percent.toFixed(2)}% for stats`;
	}
	return [newDuration, str];
}

function isBoostResult(obj: unknown): obj is BoostResult {
	return isObject(obj) && ('percentageReduction' in obj || 'percentageIncrease' in obj);
}

interface SpeedBoostOptions {
	activity: activity_type_enum;
	messages?: string[];
}

type DurationSpeedBoostOptions = SpeedBoostOptions & {
	duration: number;
	multiplier?: never;
};

type MultiplierSpeedBoostOptions = SpeedBoostOptions & {
	duration?: never;
	multiplier: number;
};

type DurationSpeedBoostResult = {
	messages: string[];
	duration: number;
};

type MultiplierSpeedBoostResult = {
	messages: string[];
	multiplier: number;
};

function calculateSkillingSpeed(
	options: DurationSpeedBoostOptions | MultiplierSpeedBoostOptions
): DurationSpeedBoostResult | MultiplierSpeedBoostResult {
	if (options.duration !== undefined && options.multiplier !== undefined) {
		throw new Error('Specify either duration or multiplier, not both.');
	}

	const messages = [...(options.messages ?? [])];
	let hasSkillingBoost = false;
	switch (options.activity) {
		case activity_type_enum.Agility:
		case activity_type_enum.AgilityArena:
		case activity_type_enum.Alching:
		case activity_type_enum.AerialFishing:
		case activity_type_enum.Birdhouse:
		case activity_type_enum.Burying:
		case activity_type_enum.CamdozaalFishing:
		case activity_type_enum.CamdozaalMining:
		case activity_type_enum.CamdozaalSmithing:
		case activity_type_enum.Casting:
		case activity_type_enum.Construction:
		case activity_type_enum.Cooking:
		case activity_type_enum.Crafting:
		case activity_type_enum.CreateForestersRations:
		case activity_type_enum.CutLeapingFish:
		case activity_type_enum.DarkAltar:
		case activity_type_enum.Disassembling:
		case activity_type_enum.DriftNet:
		case activity_type_enum.Dungeoneering:
		case activity_type_enum.Enchanting:
		case activity_type_enum.Farming:
		case activity_type_enum.Firemaking:
		case activity_type_enum.Fishing:
		case activity_type_enum.FishingTrawler:
		case activity_type_enum.Fletching:
		case activity_type_enum.Herblore:
		case activity_type_enum.Hunter:
		case activity_type_enum.GiantsFoundry:
		case activity_type_enum.GnomeRestaurant:
		case activity_type_enum.GuardiansOfTheRift:
		case activity_type_enum.KibbleMaking:
		case activity_type_enum.MemoryHarvest:
		case activity_type_enum.MahoganyHomes:
		case activity_type_enum.MageTrainingArena:
		case activity_type_enum.Mining:
		case activity_type_enum.MotherlodeMining:
		case activity_type_enum.Offering:
		case activity_type_enum.OuraniaAltar:
		case activity_type_enum.Pickpocket:
		case activity_type_enum.PuroPuro:
		case activity_type_enum.Research:
		case activity_type_enum.Runecraft:
		case activity_type_enum.Sawmill:
		case activity_type_enum.Scattering:
		case activity_type_enum.Sepulchre:
		case activity_type_enum.ShadesOfMorton:
		case activity_type_enum.ShadesOfMortonPyreLogs:
		case activity_type_enum.ShadesOfMortonSacredOil:
		case activity_type_enum.Smelting:
		case activity_type_enum.Smithing:
		case activity_type_enum.TiaraRunecraft:
		case activity_type_enum.UnderwaterAgilityThieving:
		case activity_type_enum.Tempoross:
		case activity_type_enum.TitheFarm:
		case activity_type_enum.TinkeringWorkshop:
		case activity_type_enum.TroubleBrewing:
		case activity_type_enum.BaxtorianBathhouses:
		case activity_type_enum.VolcanicMine:
		case activity_type_enum.Wintertodt:
		case activity_type_enum.Woodcutting:
		case activity_type_enum.Zalcano:
			hasSkillingBoost = true;
			break;
		default:
			break;
	}

	if (hasSkillingBoost) messages.push('2x BSO Boost 👻');
	if (options.duration !== undefined) {
		return { messages, duration: hasSkillingBoost ? options.duration / 2 : options.duration };
	}
	return { messages, multiplier: hasSkillingBoost ? options.multiplier / 2 : options.multiplier };
}

function combatSpeedCalculations(args: Omit<BoostArgs, 'currentTaskOptions'>) {
	const { monster, monsterKC, attackStyles, gearBank, maxTripLength, inputQuantity, isInWilderness } = args;
	const { skillsAsLevels } = args.gearBank;
	const messages: string[] = [];
	let [timeToFinish, percentReduced] = reducedTimeFromKC(monster, monsterKC);
	const [newTime, skillBoostMsg] = applySkillBoost(skillsAsLevels, timeToFinish, attackStyles);
	timeToFinish = newTime;
	messages.push(skillBoostMsg);

	if (percentReduced >= 1) messages.push(`${percentReduced}% for KC`);

	if (gearBank.gear.wildy.hasEquipped(['Hellfire bow']) && isInWilderness) {
		timeToFinish /= 3;
		messages.push('3x boost for Hellfire bow');
	}

	let currentTaskOptions: CombatMethodOptions = {};
	const itemCost = new Bank();
	const charges = new ChargeBank();
	const consumables: Consumable[] = [];
	const confirmations: string[] = [];

	for (const boost of mainBoostEffects) {
		const arr = Array.isArray(boost) ? boost : [boost];
		const results = arr.map(res =>
			res.run({ ...args, currentTaskOptions, ...getAttackStylesContext(attackStyles) })
		);
		const error = results.find(res => typeof res === 'string');
		if (error) return error;
		const [res] = results
			.filter(res => Boolean(res))
			.sort((a, b) => {
				if (!isBoostResult(a) || !isBoostResult(b)) {
					throw new Error('Shouldnt happen');
				}
				if (!a.percentageReduction || !b.percentageReduction) throw new Error('Shouldnt happen');
				return b.percentageReduction - a.percentageReduction;
			});

		if (!res) continue;
		if (typeof res === 'string') return res;
		const subResults = (Array.isArray(res) ? res : [res]).flat().sort((a, b) => {
			if (a.percentageReduction && b.percentageReduction) {
				return b.percentageReduction - a.percentageReduction;
			}
			return 0;
		});
		for (const boostResult of subResults) {
			if (boostResult.changes) {
				currentTaskOptions = mergeDeep(currentTaskOptions, boostResult.changes);
			}
			if (boostResult.percentageReduction) {
				timeToFinish = reduceNumByPercent(timeToFinish, boostResult.percentageReduction);
			} else if (boostResult.percentageIncrease) {
				timeToFinish = increaseNumByPercent(timeToFinish, boostResult.percentageIncrease);
			}
			if (boostResult.itemCost) itemCost.add(boostResult.itemCost);
			if (boostResult.consumables) consumables.push(...boostResult.consumables);
			if (boostResult.charges) charges.add(boostResult.charges);
			if (boostResult.confirmation) confirmations.push(boostResult.confirmation);
			if (boostResult.message) messages.push(boostResult.message);
		}
	}

	timeToFinish = Math.ceil(timeToFinish);

	if (monster.itemCost) {
		consumables.push(...(Array.isArray(monster.itemCost) ? monster.itemCost : [monster.itemCost]));
	}

	const consumablesCost = getItemCostFromConsumables({
		consumableCosts: consumables,
		gearBank,
		timeToFinish,
		maxTripLength,
		inputQuantity,
		slayerKillsRemaining: args.killsRemaining
	});
	timeToFinish = Math.floor(consumablesCost.timeToFinish);

	const updateBank = new UpdateBank();
	updateBank.itemCostBank.add(itemCost);
	updateBank.chargeBank.add(charges);

	if (consumablesCost.itemCost) {
		updateBank.itemCostBank.add(consumablesCost.itemCost);
	}

	if (consumablesCost?.boosts) {
		messages.push(...consumablesCost.boosts.map(m => m.message));
	}

	const result = schema.parse({
		timeToFinish,
		messages,
		currentTaskOptions,
		finalQuantity: consumablesCost.finalQuantity,
		confirmations,
		updateBank
	});

	return result;
}

/** Calculates speed for skilling activities and combat trips. */
export function speedCalculations(options: DurationSpeedBoostOptions): DurationSpeedBoostResult;
export function speedCalculations(options: MultiplierSpeedBoostOptions): MultiplierSpeedBoostResult;
export function speedCalculations(
	args: Omit<BoostArgs, 'currentTaskOptions'>
): ReturnType<typeof combatSpeedCalculations>;
export function speedCalculations(
	options: DurationSpeedBoostOptions | MultiplierSpeedBoostOptions | Omit<BoostArgs, 'currentTaskOptions'>
) {
	if ('activity' in options) return calculateSkillingSpeed(options);
	return combatSpeedCalculations(options);
}
