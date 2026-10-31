import { Client } from 'pg';

const client = new Client();

try {
	await client.connect();
	const { rows } = await client.query<{
		username: string;
		remaining_seconds: number;
		type: string;
	}>(`
		SELECT
			COALESCE(u."RSN", u.id) AS username,
			FLOOR(EXTRACT(EPOCH FROM (a.finish_date - NOW())))::int AS remaining_seconds,
			a.type::text AS type
		FROM activity a
		LEFT JOIN users u ON u.id = a.user_id::text
		WHERE a.completed = FALSE
			AND a.finish_date > NOW()
			AND a.finish_date <= NOW() + INTERVAL '60 seconds'
		ORDER BY a.finish_date
	`);

	if (rows.length > 0) {
		console.log('Username | Time remaining | Task Type');
		for (const activity of rows) {
			console.log(`${activity.username} | ${activity.remaining_seconds}s | ${activity.type}`);
		}
		process.exitCode = 1;
	}
} catch (error) {
	console.error(error);
	process.exitCode = 2;
} finally {
	await client.end();
}
