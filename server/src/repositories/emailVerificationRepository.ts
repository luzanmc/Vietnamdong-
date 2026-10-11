import { pool, type Queryable } from '../db/database.js';
import type { EmailVerification } from '../types/index.js';

export async function createEmailVerification(
  id: string,
  userId: string,
  tokenHash: string,
  expiresAt: string,
  client: Queryable = pool
): Promise<void> {
  await client.query('INSERT INTO email_verifications (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)', [
    id,
    userId,
    tokenHash,
    expiresAt,
  ]);
}

export async function findValidEmailVerification(
  tokenHash: string,
  client: Queryable = pool
): Promise<EmailVerification | undefined> {
  const { rows } = await client.query(
    `SELECT * FROM email_verifications WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()`,
    [tokenHash]
  );
  return rows[0];
}

export async function markEmailVerificationUsed(id: string, client: Queryable = pool): Promise<void> {
  await client.query(`UPDATE email_verifications SET used_at = now() WHERE id = $1`, [id]);
}
