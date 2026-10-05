import type { PermissionKey, SpecialResponse } from '@oldschoolgg/discord';
import type { IMember } from '@oldschoolgg/schemas';

import type { AnyArr, AsOptArr, ExtractOptions } from '@/discord/index.js';

export type CategoryFlag =
	| 'minion'
	| 'settings'
	| 'patron'
	| 'skilling'
	| 'pvm'
	| 'minigame'
	| 'utility'
	| 'fun'
	| 'simulation';

export interface AbstractCommandAttributes {
	examples?: string[];
	categoryFlags?: CategoryFlag[];
	enabled?: boolean;
	requiresMinionNotBusy?: boolean;
	requiresMinion?: boolean;
	description: string;
}

function hasInvalidQuantity(value: unknown): boolean {
	if (value === null || typeof value !== 'object') return false;

	for (const [key, nestedValue] of Object.entries(value)) {
		if (key === 'quantity') {
			if (typeof nestedValue !== 'number' || !Number.isSafeInteger(nestedValue) || nestedValue < 1) {
				return true;
			}
			continue;
		}
		if (hasInvalidQuantity(nestedValue)) return true;
	}

	return false;
}

export function defineCommand<const T extends AnyArr<unknown>>(
	cmd: Readonly<{
		name: string;
		flags?: CommandFlag[];
		attributes?: Omit<AbstractCommandAttributes, 'description'>;
		description: string;
		options: T;
		requiredPermissions?: PermissionKey[];
		guildId?: string;
		run(options: CommandRunOptions<ExtractOptions<T>>): CommandResponse;
	}> &
		(T[number] extends CommandOption ? unknown : { __error__: 'options must be CommandOption[]' })
): OSBMahojiCommand<AsOptArr<T>> {
	return {
		...cmd,
		async run(commandOptions: CommandRunOptions<ExtractOptions<T>>): CommandResponse {
			if (hasInvalidQuantity(commandOptions.options)) return 'Quantity must be a positive whole number.';
			return cmd.run(commandOptions);
		}
	} as unknown as OSBMahojiCommand<AsOptArr<T>>;
}

export type CommandResponse = Promise<CommandResponseValue>;

export type CommandResponseValue = SendableMessage | SpecialResponse;

type OSBMahojiCommand<T extends readonly CommandOption[] = CommandOption[]> = Readonly<{
	name: string;
	attributes?: Omit<AbstractCommandAttributes, 'description'>;
	description: string;
	options: T;
	requiredPermissions?: PermissionKey[];
	guildId?: string;
	run(options: CommandRunOptions<ExtractOptions<T>>): CommandResponse;
}>;

export type CommandRunOptions<TOpts = {}> = {
	interaction: OSInteraction;
	options: TOpts;
	user: MUser;
	member: IMember | null;
	channelId: string;
	guildId: string | null;
	userId: string;
	rng: RNGProvider;
};

type CommandFlag = 'REQUIRES_LOCK';

export type AnyCommand = Readonly<{
	name: string;
	flags?: CommandFlag[];
	attributes?: Omit<AbstractCommandAttributes, 'description'>;
	description: string;
	options: readonly CommandOption[];
	requiredPermissions?: PermissionKey[];
	guildId?: string;
	run(options: CommandRunOptions): CommandResponse;
}>;
