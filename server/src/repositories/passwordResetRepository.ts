import { pool, type Queryable } from '../db/database.js';
import type { PasswordReset } from '../types/index.js';

export async function createPasswordReset(
  id: string,
  userId: string,
  tokenHash: string,
  expiresAt: string,
  client: Queryable = pool
): Promise<void> {
  await client.query('INSERT INTO password_resets (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)', [
    id,
    userId,
    tokenHash,
    expiresAt,
  ]);
}

export async function findValidPasswordReset(tokenHash: string, client: Queryable = pool): Promise<PasswordReset | undefined> {
  const { rows } = await client.query(
    `SELECT * FROM password_resets WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()`,
    [tokenHash]
  );
  return rows[0];
}

export async function markPasswordResetUsed(id: string, client: Queryable = pool): Promise<void> {
  await client.query(`UPDATE password_resets SET used_at = now() WHERE id = $1`, [id]);
}

export async function invalidatePendingResetsForUser(userId: string, client: Queryable = pool): Promise<void> {
  await client.query(`UPDATE password_resets SET used_at = now() WHERE user_id = $1 AND used_at IS NULL`, [userId]);
}
