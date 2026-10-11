import { pool, type Queryable } from '../db/database.js';

export interface TotpRecord {
  user_id: string;
  secret: string;
  enabled: number;
}

export async function getTotp(userId: string, client: Queryable = pool): Promise<TotpRecord | undefined> {
  const { rows } = await client.query('SELECT user_id, secret, enabled FROM totp_secrets WHERE user_id = $1', [userId]);
  return rows[0];
}

export async function saveTotpSecret(userId: string, secret: string, client: Queryable = pool): Promise<void> {
  await client.query(
    `INSERT INTO totp_secrets (user_id, secret, enabled) VALUES ($1, $2, 0)
     ON CONFLICT (user_id) DO UPDATE SET secret = $2, enabled = 0`,
    [userId, secret]
  );
}

export async function enableTotp(userId: string, client: Queryable = pool): Promise<void> {
  await client.query('UPDATE totp_secrets SET enabled = 1 WHERE user_id = $1', [userId]);
}

export async function deleteTotp(userId: string, client: Queryable = pool): Promise<void> {
  await client.query('DELETE FROM totp_secrets WHERE user_id = $1', [userId]);
}
