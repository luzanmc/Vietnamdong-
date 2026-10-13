import { pool, type Queryable } from '../db/database.js';
import type { Giftcode, GiftcodeRedemption } from '../types/index.js';

export async function getGiftcodeByCode(code: string, client?: Queryable): Promise<Giftcode | null> {
  const db = client || pool;
  const { rows } = await db.query<Giftcode>(
    'SELECT * FROM giftcodes WHERE UPPER(code) = UPPER($1) LIMIT 1',
    [code.trim()]
  );
  return rows[0] || null;
}

export async function getGiftcodeById(id: string, client?: Queryable): Promise<Giftcode | null> {
  const db = client || pool;
  const { rows } = await db.query<Giftcode>(
    'SELECT * FROM giftcodes WHERE id = $1 LIMIT 1',
    [id]
  );
  return rows[0] || null;
}

export async function getAllGiftcodes(): Promise<Giftcode[]> {
  const { rows } = await pool.query<Giftcode>(
    'SELECT * FROM giftcodes ORDER BY created_at DESC'
  );
  return rows;
}

export async function createGiftcode(
  id: string,
  code: string,
  rewardNova: number,
  maxUses: number = 1,
  expiresAt: string | null = null
): Promise<Giftcode> {
  const { rows } = await pool.query<Giftcode>(
    `INSERT INTO giftcodes (id, code, reward_nova, max_uses, used_count, expires_at, active)
     VALUES ($1, UPPER($2), $3, $4, 0, $5, 1)
     RETURNING *`,
    [id, code.trim(), rewardNova, maxUses, expiresAt]
  );
  return rows[0];
}

export async function toggleGiftcodeActive(id: string): Promise<Giftcode | null> {
  const { rows } = await pool.query<Giftcode>(
    'UPDATE giftcodes SET active = CASE WHEN active = 1 THEN 0 ELSE 1 END WHERE id = $1 RETURNING *',
    [id]
  );
  return rows[0] || null;
}

export async function deleteGiftcode(id: string): Promise<boolean> {
  const { rowCount } = await pool.query('DELETE FROM giftcodes WHERE id = $1', [id]);
  return (rowCount ?? 0) > 0;
}

export async function hasUserRedeemedGiftcode(giftcodeId: string, userId: string, client?: Queryable): Promise<boolean> {
  const db = client || pool;
  const { rows } = await db.query(
    'SELECT 1 FROM giftcode_redemptions WHERE giftcode_id = $1 AND user_id = $2 LIMIT 1',
    [giftcodeId, userId]
  );
  return rows.length > 0;
}

export async function recordGiftcodeRedemption(
  id: string,
  giftcodeId: string,
  userId: string,
  rewardNova: number,
  client: Queryable
): Promise<GiftcodeRedemption> {
  const { rows } = await client.query<GiftcodeRedemption>(
    `INSERT INTO giftcode_redemptions (id, giftcode_id, user_id, reward_nova)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [id, giftcodeId, userId, rewardNova]
  );
  return rows[0];
}

export async function incrementGiftcodeUsedCount(giftcodeId: string, client: Queryable): Promise<void> {
  await client.query(
    'UPDATE giftcodes SET used_count = used_count + 1 WHERE id = $1',
    [giftcodeId]
  );
}
