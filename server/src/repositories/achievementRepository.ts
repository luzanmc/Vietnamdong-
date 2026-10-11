import { pool, type Queryable } from '../db/database.js';

export async function getUnlockedCodes(userId: string, client: Queryable = pool): Promise<Set<string>> {
  const { rows } = await client.query<{ code: string }>('SELECT code FROM user_achievements WHERE user_id = $1', [userId]);
  return new Set(rows.map((r) => r.code));
}

export async function unlockAchievement(userId: string, code: string, client: Queryable = pool): Promise<void> {
  await client.query('INSERT INTO user_achievements (user_id, code) VALUES ($1, $2) ON CONFLICT DO NOTHING', [userId, code]);
}

export async function getAchievementStats(userId: string, client: Queryable = pool): Promise<{
  tasksCompleted: number;
  streakDays: number;
  referredCount: number;
  lifetimeEarned: number;
}> {
  const tasksResult = await client.query(
    `SELECT COUNT(*) AS c FROM task_attempts WHERE user_id = $1 AND status = 'completed'`,
    [userId]
  );
  const userResult = await client.query('SELECT streak_days FROM users WHERE id = $1', [userId]);
  const referredResult = await client.query('SELECT COUNT(*) AS c FROM users WHERE referred_by = $1', [userId]);
  const earnedResult = await client.query(
    `SELECT COALESCE(SUM(amount), 0)::int AS s FROM coin_ledger WHERE user_id = $1 AND amount > 0`,
    [userId]
  );

  return {
    tasksCompleted: Number(tasksResult.rows[0].c),
    streakDays: userResult.rows[0]?.streak_days ?? 0,
    referredCount: Number(referredResult.rows[0].c),
    lifetimeEarned: Number(earnedResult.rows[0].s),
  };
}
