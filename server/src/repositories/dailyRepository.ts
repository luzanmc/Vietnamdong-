import { pool, type Queryable } from '../db/database.js';

export async function getClaimForDate(
  userId: string,
  date: string,
  client: Queryable = pool
): Promise<{ claim_date: string } | undefined> {
  const { rows } = await client.query('SELECT claim_date FROM daily_claims WHERE user_id = $1 AND claim_date = $2', [
    userId,
    date,
  ]);
  return rows[0];
}

export async function createClaim(
  id: string,
  userId: string,
  date: string,
  rewardNova: number,
  streakDay: number,
  client: Queryable = pool
): Promise<void> {
  await client.query(
    `INSERT INTO daily_claims (id, user_id, claim_date, reward_nova, streak_day) VALUES ($1, $2, $3, $4, $5)`,
    [id, userId, date, rewardNova, streakDay]
  );
}
