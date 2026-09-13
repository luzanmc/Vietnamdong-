import { pool, type Queryable } from '../db/database.js';

export interface LeaderboardRow {
  username: string;
  avatar_url: string | null;
  earned: number;
}

export async function weeklyTop(client: Queryable = pool): Promise<LeaderboardRow[]> {
  const { rows } = await client.query(`
    SELECT u.username, u.avatar_url, COALESCE(SUM(l.amount), 0)::int AS earned
    FROM users u
    LEFT JOIN coin_ledger l ON l.user_id = u.id
      AND l.reason = 'task_reward' AND l.created_at >= now() - interval '7 days'
    GROUP BY u.id
    ORDER BY earned DESC
    LIMIT 20
  `);
  return rows;
}

export async function dailyTop(client: Queryable = pool): Promise<LeaderboardRow[]> {
  const { rows } = await client.query(`
    SELECT u.username, u.avatar_url, COALESCE(SUM(l.amount), 0)::int AS earned
    FROM users u
    LEFT JOIN coin_ledger l ON l.user_id = u.id
      AND l.reason = 'task_reward' AND l.created_at::date = CURRENT_DATE
    GROUP BY u.id
    ORDER BY earned DESC
    LIMIT 20
  `);
  return rows;
}

export async function recordDaily(client: Queryable = pool): Promise<(LeaderboardRow & { day: string })[]> {
  const { rows } = await client.query(`
    SELECT u.username, u.avatar_url, l.created_at::date::text AS day, SUM(l.amount)::int AS earned
    FROM coin_ledger l
    JOIN users u ON u.id = l.user_id
    WHERE l.reason = 'task_reward'
    GROUP BY l.user_id, u.username, u.avatar_url, l.created_at::date
    ORDER BY earned DESC
    LIMIT 10
  `);
  return rows;
}

export async function myChart(userId: string, client: Queryable = pool): Promise<{ day: string; net: number }[]> {
  const { rows } = await client.query(
    `SELECT created_at::date::text AS day, SUM(amount)::int AS net
     FROM coin_ledger
     WHERE user_id = $1 AND created_at >= now() - interval '30 days'
     GROUP BY created_at::date
     ORDER BY day ASC`,
    [userId]
  );
  return rows;
}
