import { pool, type Queryable } from '../db/database.js';

export async function getSpinClaimForDate(userId: string, date: string, client: Queryable = pool): Promise<{ id: string } | undefined> {
  const { rows } = await client.query('SELECT id FROM spin_claims WHERE user_id = $1 AND spin_date = $2', [userId, date]);
  return rows[0];
}

export async function createSpinClaim(
  id: string,
  userId: string,
  date: string,
  rewardNova: number,
  client: Queryable = pool
): Promise<void> {
  await client.query('INSERT INTO spin_claims (id, user_id, spin_date, reward_nova) VALUES ($1, $2, $3, $4)', [
    id,
    userId,
    date,
    rewardNova,
  ]);
}
