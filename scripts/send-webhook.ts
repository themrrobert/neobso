#!/usr/bin/env pnpm tsx

import { readFile } from 'node:fs/promises';

import { RedisKeys } from '@oldschoolgg/util';
import { Redis } from 'ioredis';

type Options = Record<string, string | boolean | string[]>;

const usage = `Usage: pnpm tsx scripts/send-webhook.ts [options] [message]

Required:
  --url URL                         WEBHOOK_URL
  --id ID --token TOKEN             WEBHOOK_ID, WEBHOOK_TOKEN
  -c, --channel CHANNEL_ID          WEBHOOK_CHANNEL (looks up a cached webhook)
  -b, --bot BOT                     WEBHOOK_BOT: neo, bso, or osb
  --neo, --bso, --osb               Select the bot for a cached webhook lookup

Message input:
  -m, --message TEXT                WEBHOOK_CONTENT
  -f, --file PATH                   WEBHOOK_FILE (use - for stdin)
  --upload PATH                     WEBHOOK_UPLOAD (repeatable; uploads a file)

Discord fields (flag / environment variable):
  --username TEXT                   WEBHOOK_USERNAME
  --avatar-url URL                  WEBHOOK_AVATAR_URL
  --tts                             WEBHOOK_TTS=true
  --embeds JSON                     WEBHOOK_EMBEDS
  --allowed-mentions JSON           WEBHOOK_ALLOWED_MENTIONS
  --components JSON                 WEBHOOK_COMPONENTS
  --flags NUMBER                    WEBHOOK_FLAGS
  --thread-name TEXT                WEBHOOK_THREAD_NAME
  --applied-tags JSON               WEBHOOK_APPLIED_TAGS
  --attachments JSON                WEBHOOK_ATTACHMENTS
  --poll JSON                       WEBHOOK_POLL
  --wait                            WEBHOOK_WAIT=true
  --thread-id ID                    WEBHOOK_THREAD_ID
  --with-components                 WEBHOOK_WITH_COMPONENTS=true
  --json JSON                       WEBHOOK_JSON (merged last; for any API body field)
  -h, --help

Examples:
  WEBHOOK_ID=123 WEBHOOK_TOKEN=secret pnpm tsx scripts/send-webhook.ts 'Hello'
  pnpm tsx scripts/send-webhook.ts -c 123 -b bso 'Hello'
  pnpm tsx scripts/send-webhook.ts --url "$WEBHOOK_URL" -f - --username Cyr
  pnpm tsx scripts/send-webhook.ts --id 123 --token secret --upload report.txt -m 'Report'`;

function fail(message: string): never {
	console.error(`Error: ${message}`);
	process.exit(1);
}

function parseArgs(argv: string[]): Options {
	const options: Options = {};
	const aliases: Record<string, string> = {
		'-m': 'message',
		'-f': 'file',
		'-h': 'help',
		'-c': 'channel',
		'-b': 'bot'
	};
	const booleans = new Set(['help', 'tts', 'wait', 'with-components', 'neo', 'bso', 'osb']);
	const repeated = new Set(['upload']);

	for (let index = 0; index < argv.length; index++) {
		const arg = aliases[argv[index]] ?? argv[index];
		if (!arg.startsWith('--') && !['message', 'file', 'help', 'channel', 'bot'].includes(arg)) {
			const messages = (options.message as string[] | undefined) ?? [];
			messages.push(argv[index]);
			options.message = messages;
			continue;
		}
		const key = arg.replace(/^--/, '');
		if (booleans.has(key)) {
			options[key] = true;
			continue;
		}
		const value = argv[++index];
		if (!value || (value.startsWith('-') && !(key === 'file' && value === '-'))) fail(`Missing value for ${arg}`);
		if (repeated.has(key)) {
			const values = (options[key] as string[] | undefined) ?? [];
			values.push(value);
			options[key] = values;
		} else if (key === 'message') {
			const messages = (options.message as string[] | undefined) ?? [];
			messages.push(value);
			options.message = messages;
		} else {
			options[key] = value;
		}
	}
	return options;
}

function value(options: Options, key: string, environment: string): string | undefined {
	const option = options[key];
	return typeof option === 'string' ? option : process.env[environment];
}

function enabled(options: Options, key: string, environment: string): boolean {
	if (options[key] === true) return true;
	return /^(1|true|yes)$/i.test(process.env[environment] ?? '');
}

async function readStdin(): Promise<string> {
	const chunks: Buffer[] = [];
	for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
	return Buffer.concat(chunks).toString('utf8');
}

function json(value: string, name: string): unknown {
	try {
		return JSON.parse(value);
	} catch {
		fail(`${name} must be valid JSON`);
	}
}

type Bot = 'neo' | 'bso' | 'osb';

function getBot(options: Options): Bot | undefined {
	const selected = (['neo', 'bso', 'osb'] as const).filter(bot => options[bot] === true);
	if (selected.length > 1) fail('Provide only one of --neo, --bso, or --osb');
	const bot = selected[0] ?? value(options, 'bot', 'WEBHOOK_BOT')?.toLowerCase();
	if (bot === undefined) return undefined;
	if (!['neo', 'bso', 'osb'].includes(bot)) fail('WEBHOOK_BOT/--bot must be neo, bso, or osb');
	return bot as Bot;
}

async function getWebhookFromRedis(channelId: string, bot: Bot): Promise<{ id: string; token: string }> {
	const redis = new Redis({
		host: process.env.REDIS_HOST ?? 'localhost',
		port: Number(process.env.REDIS_PORT ?? 6379)
	});
	try {
		const key = RedisKeys[bot === 'neo' ? 'Neo' : bot.toUpperCase() as 'BSO' | 'OSB'].Webhook(channelId);
		const raw = await redis.get(key);
		if (!raw) fail(`No cached webhook found for channel ${channelId} on ${bot}`);
		const webhook: unknown = json(raw, `Redis key ${key}`);
		if (
			typeof webhook !== 'object' ||
			webhook === null ||
			typeof (webhook as Record<string, unknown>).id !== 'string' ||
			typeof (webhook as Record<string, unknown>).token !== 'string'
		) {
			fail(`Redis key ${key} does not contain a webhook`);
		}
		return webhook as { id: string; token: string };
	} finally {
		redis.disconnect();
	}
}

const options = parseArgs(process.argv.slice(2));
if (options.help) {
	console.log(usage);
	process.exit();
}

const channelId = value(options, 'channel', 'WEBHOOK_CHANNEL');
const shouldLookupRedis = options.channel !== undefined || (process.env.WEBHOOK_CHANNEL !== undefined && process.env.WEBHOOK_BOT !== undefined);
const cachedWebhook = shouldLookupRedis
	? await getWebhookFromRedis(channelId ?? fail('WEBHOOK_CHANNEL is required for Redis lookup'), getBot(options) ?? fail('WEBHOOK_BOT/--bot is required for Redis lookup'))
	: undefined;
const webhookURL = value(options, 'url', 'WEBHOOK_URL');
const webhookID = cachedWebhook?.id ?? value(options, 'id', 'WEBHOOK_ID');
const token = cachedWebhook?.token ?? value(options, 'token', 'WEBHOOK_TOKEN');
const endpoint =
	cachedWebhook !== undefined
		? `https://discord.com/api/v10/webhooks/${webhookID}/${token}`
		: webhookURL ?? (webhookID && token ? `https://discord.com/api/v10/webhooks/${webhookID}/${token}` : undefined);
if (!endpoint) fail('Provide --url/WEBHOOK_URL or --id/WEBHOOK_ID and --token/WEBHOOK_TOKEN');

const rawJSON = value(options, 'json', 'WEBHOOK_JSON');
const body: Record<string, unknown> =
	rawJSON === undefined ? {} : (json(rawJSON, 'WEBHOOK_JSON') as Record<string, unknown>);
if (Array.isArray(body) || body === null) fail('WEBHOOK_JSON must be a JSON object');
const fieldMap: Array<[string, string, string]> = [
	['username', 'username', 'WEBHOOK_USERNAME'],
	['avatar-url', 'avatar_url', 'WEBHOOK_AVATAR_URL'],
	['embeds', 'embeds', 'WEBHOOK_EMBEDS'],
	['allowed-mentions', 'allowed_mentions', 'WEBHOOK_ALLOWED_MENTIONS'],
	['components', 'components', 'WEBHOOK_COMPONENTS'],
	['flags', 'flags', 'WEBHOOK_FLAGS'],
	['thread-name', 'thread_name', 'WEBHOOK_THREAD_NAME'],
	['applied-tags', 'applied_tags', 'WEBHOOK_APPLIED_TAGS'],
	['attachments', 'attachments', 'WEBHOOK_ATTACHMENTS'],
	['poll', 'poll', 'WEBHOOK_POLL']
];
for (const [option, field, environment] of fieldMap) {
	const input = value(options, option, environment);
	if (input === undefined) continue;
	body[field] = ['embeds', 'allowed_mentions', 'components', 'applied_tags', 'attachments', 'poll'].includes(field)
		? json(input, environment)
		: field === 'flags'
			? Number(input)
			: input;
}
if (enabled(options, 'tts', 'WEBHOOK_TTS')) body.tts = true;

const messages = options.message as string[] | undefined;
let content = messages?.join(' ') ?? process.env.WEBHOOK_CONTENT;
const inputFile = value(options, 'file', 'WEBHOOK_FILE');
if (inputFile) content = inputFile === '-' ? await readStdin() : await readFile(inputFile, 'utf8');
if (content !== undefined) body.content = content;

const uploads = [
	...((options.upload as string[] | undefined) ?? []),
	...(process.env.WEBHOOK_UPLOAD ? process.env.WEBHOOK_UPLOAD.split(';').filter(Boolean) : [])
];
const url = new URL(endpoint);
for (const [option, query, environment] of [
	['thread-id', 'thread_id', 'WEBHOOK_THREAD_ID'],
	['wait', 'wait', 'WEBHOOK_WAIT'],
	['with-components', 'with_components', 'WEBHOOK_WITH_COMPONENTS']
] as const) {
	const input =
		option === 'wait' || option === 'with-components'
			? enabled(options, option, environment)
			: value(options, option, environment);
	if (input) url.searchParams.set(query, String(input));
}

if (!body.content && uploads.length === 0 && !body.embeds && !body.components && !body.poll) {
	fail('Provide a message, upload, embeds, components, or poll');
}

let response: Response;
if (uploads.length > 0) {
	const form = new FormData();
	form.set('payload_json', JSON.stringify(body));
	for (const [index, path] of uploads.entries())
		form.set(`files[${index}]`, new Blob([await readFile(path)]), path.split(/[\\/]/).pop());
	response = await fetch(url, { method: 'POST', body: form });
} else {
	response = await fetch(url, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(body)
	});
}

if (!response.ok) fail(`Discord returned ${response.status}: ${await response.text()}`);
const responseBody = await response.text();
if (responseBody) console.log(responseBody);
