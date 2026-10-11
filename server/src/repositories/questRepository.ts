import { pool, type Queryable } from '../db/database.js';

export async function countTasksCompletedSince(userId: string, since: Date, client: Queryable = pool): Promise<number> {
  const { rows } = await client.query(
    `SELECT COUNT(*) AS c FROM task_attempts WHERE user_id = $1 AND status = 'completed' AND completed_at >= $2`,
    [userId, since.toISOString()]
  );
  return Number(rows[0].c);
}

export async function isQuestClaimed(userId: string, questCode: string, periodKey: string, client: Queryable = pool): Promise<boolean> {
  const { rows } = await client.query(
    'SELECT claimed FROM quest_progress WHERE user_id = $1 AND quest_code = $2 AND period_key = $3',
    [userId, questCode, periodKey]
  );
  return rows[0]?.claimed === 1;
}

export async function markQuestClaimed(userId: string, questCode: string, periodKey: string, client: Queryable = pool): Promise<void> {
  await client.query(
    `INSERT INTO quest_progress (id, user_id, quest_code, period_key, claimed)
     VALUES ($1, $2, $3, $4, 1)
     ON CONFLICT (user_id, quest_code, period_key) DO UPDATE SET claimed = 1`,
    [`${userId}_${questCode}_${periodKey}`, userId, questCode, periodKey]
  );
}
