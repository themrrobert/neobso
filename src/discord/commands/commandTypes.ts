import type { PermissionKey, SpecialResponse } from '@oldschoolgg/discord';
import type { IMember } from '@oldschoolgg/schemas';

import type { AnyArr, AsOptArr, ExtractOptions } from '@/discord/index.js';
import { globalConfig } from '@/lib/constants.js';

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

function inputValidationErrorMsg(optionName: string, problem: string) {
	return `Input error: \`${optionName}\` ${problem}`;
}
function validateCommandOptions(value: unknown, optionDefinitions: readonly CommandOption[]): string | undefined {
	if (value === null || typeof value !== 'object') return 'Invalid command options.';

	for (const option of optionDefinitions) {
		let optionValue = (value as Record<string, unknown>)[option.name];
		if (optionValue === undefined) {
			if (option.required) return inputValidationErrorMsg(option.name, 'is required.');
			continue;
		}

		if (option.type === 'Subcommand' || option.type === 'SubcommandGroup') {
			const error = validateCommandOptions(optionValue, option.options ?? []);
			if (error) return error;
			continue;
		}

		if (option.type === 'String') {
			if (typeof optionValue !== 'string') return inputValidationErrorMsg(option.name, 'must be text.');
			if (option.choices && !option.choices.some(choice => choice.value === optionValue)) {
				return inputValidationErrorMsg(option.name, 'is not a valid choice.');
			}
			continue;
		}
		if (option.type === 'Boolean') {
			if (typeof optionValue !== 'boolean') {
				const valueDescription = optionValue === null ? 'null' : JSON.stringify(optionValue);
				globalClient
					.sendDm(globalConfig.adminUserIDs[0], {
						content: `[${Date.now()}] Boolean option \`${option.name}\` isn't c-bool. Value: ${valueDescription}`,
						files: [
							{
								buffer: Buffer.from(JSON.stringify({ optionDefinitions, value }, null, 2)),
								name: 'command-options.json'
							}
						]
					})
					.catch(() => {});
				return inputValidationErrorMsg(option.name, 'must be true or false. Please tell Cyr');
			}
			continue;
		}
		if (option.type !== 'Integer' && option.type !== 'Number') continue;

		optionValue = Number(optionValue);
		if (typeof optionValue !== 'number' || !Number.isFinite(optionValue)) {
			return inputValidationErrorMsg(option.name, 'must be a number.');
		}
		if (option.type === 'Integer' && !Number.isSafeInteger(optionValue)) {
			return inputValidationErrorMsg(option.name, 'must be a whole number.');
		}
		if (option.min_value !== undefined && optionValue < option.min_value) {
			return inputValidationErrorMsg(option.name, `must be at least ${option.min_value}.`);
		}
		if (option.max_value !== undefined && optionValue > option.max_value) {
			return inputValidationErrorMsg(option.name, `must be at most ${option.max_value}.`);
		}
		if (option.choices && !option.choices.some(choice => choice.value === optionValue)) {
			return inputValidationErrorMsg(option.name, 'is not a valid choice.');
		}
	}
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
			const validationError = validateCommandOptions(
				commandOptions.options,
				cmd.options as readonly CommandOption[]
			);
			if (validationError) return validationError;
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
