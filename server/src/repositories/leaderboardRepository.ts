import { pool, type Queryable } from '../db/database.js';
import { calculateLevel, type LevelInfo } from '../services/levelService.js';

export interface LeaderboardRow {
  username: string;
  avatar_url: string | null;
  earned: number;
  xp: number;
  level: number;
  levelProgress: LevelInfo;
}

function mapWithLevel<T extends { xp: number }>(
  rows: T[]
): (T & { level: number; levelProgress: LevelInfo })[] {
  return rows.map((r) => {
    const levelProgress = calculateLevel(r.xp);
    return {
      ...r,
      level: levelProgress.level,
      levelProgress,
    };
  });
}

export async function weeklyTop(client: Queryable = pool): Promise<LeaderboardRow[]> {
  const { rows } = await client.query<{ username: string; avatar_url: string | null; earned: number; xp: number }>(`
    SELECT u.username, u.avatar_url, COALESCE(u.xp, 0)::int AS xp, COALESCE(SUM(l.amount), 0)::int AS earned
    FROM users u
    LEFT JOIN coin_ledger l ON l.user_id = u.id
      AND l.reason = 'task_reward' AND l.created_at >= now() - interval '7 days'
    GROUP BY u.id, u.username, u.avatar_url, u.xp
    ORDER BY earned DESC
    LIMIT 20
  `);
  return mapWithLevel(rows);
}

export async function dailyTop(client: Queryable = pool): Promise<LeaderboardRow[]> {
  const { rows } = await client.query<{ username: string; avatar_url: string | null; earned: number; xp: number }>(`
    SELECT u.username, u.avatar_url, COALESCE(u.xp, 0)::int AS xp, COALESCE(SUM(l.amount), 0)::int AS earned
    FROM users u
    LEFT JOIN coin_ledger l ON l.user_id = u.id
      AND l.reason = 'task_reward' AND l.created_at::date = CURRENT_DATE
    GROUP BY u.id, u.username, u.avatar_url, u.xp
    ORDER BY earned DESC
    LIMIT 20
  `);
  return mapWithLevel(rows);
}

export async function recordDaily(
  client: Queryable = pool
): Promise<(LeaderboardRow & { day: string })[]> {
  const { rows } = await client.query<{ username: string; avatar_url: string | null; day: string; earned: number; xp: number }>(`
    SELECT u.username, u.avatar_url, COALESCE(u.xp, 0)::int AS xp, l.created_at::date::text AS day, SUM(l.amount)::int AS earned
    FROM coin_ledger l
    JOIN users u ON u.id = l.user_id
    WHERE l.reason = 'task_reward'
    GROUP BY l.user_id, u.username, u.avatar_url, u.xp, l.created_at::date
    ORDER BY earned DESC
    LIMIT 10
  `);
  return mapWithLevel(rows);
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

export async function monthlyTop(client: Queryable = pool): Promise<LeaderboardRow[]> {
  const { rows } = await client.query<{ username: string; avatar_url: string | null; earned: number; xp: number }>(`
    SELECT u.username, u.avatar_url, COALESCE(u.xp, 0)::int AS xp, COALESCE(SUM(l.amount), 0)::int AS earned
    FROM users u
    LEFT JOIN coin_ledger l ON l.user_id = u.id
      AND l.reason = 'task_reward' AND l.created_at >= date_trunc('month', now())
    GROUP BY u.id, u.username, u.avatar_url, u.xp
    ORDER BY earned DESC
    LIMIT 20
  `);
  return mapWithLevel(rows);
}

export async function topReferrers(
  client: Queryable = pool
): Promise<(LeaderboardRow & { referred_count: number })[]> {
  const { rows } = await client.query<{ username: string; avatar_url: string | null; referred_count: number; earned: number; xp: number }>(`
    SELECT
      u.username,
      u.avatar_url,
      COALESCE(u.xp, 0)::int AS xp,
      (SELECT COUNT(*) FROM users ref WHERE ref.referred_by = u.id)::int AS referred_count,
      (SELECT COALESCE(SUM(amount), 0) FROM coin_ledger WHERE user_id = u.id AND reason = 'referral_bonus')::int AS earned
    FROM users u
    WHERE EXISTS (SELECT 1 FROM users ref WHERE ref.referred_by = u.id)
    ORDER BY referred_count DESC, earned DESC
    LIMIT 20
  `);
  return mapWithLevel(rows);
}
