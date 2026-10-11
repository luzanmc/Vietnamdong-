import { pool, type Queryable } from '../db/database.js';
import type { CreatorCode } from '../types/index.js';

export async function getCreatorCodeByOwner(ownerUserId: string, client: Queryable = pool): Promise<CreatorCode | undefined> {
  const { rows } = await client.query('SELECT * FROM creator_codes WHERE owner_user_id = $1', [ownerUserId]);
  return rows[0];
}

export async function getActiveCreatorCodeByCode(code: string, client: Queryable = pool): Promise<CreatorCode | undefined> {
  const { rows } = await client.query('SELECT * FROM creator_codes WHERE code = $1 AND active = 1', [code]);
  return rows[0];
}

export async function countUsersUsingCode(creatorCodeId: string, client: Queryable = pool): Promise<number> {
  const { rows } = await client.query('SELECT COUNT(*) AS c FROM users WHERE creator_code_id = $1', [creatorCodeId]);
  return Number(rows[0].c);
}

export async function createCreatorCode(
  id: string,
  code: string,
  ownerUserId: string,
  bonusPercent: number,
  client: Queryable = pool
): Promise<void> {
  await client.query('INSERT INTO creator_codes (id, code, owner_user_id, bonus_percent) VALUES ($1, $2, $3, $4)', [
    id,
    code,
    ownerUserId,
    bonusPercent,
  ]);
}

export async function updateCreatorCodeAdmin(
  id: string,
  patch: { bonus_percent?: number; active?: number },
  client: Queryable = pool
): Promise<void> {
  await client.query(
    `UPDATE creator_codes SET
       bonus_percent = COALESCE($1, bonus_percent),
       active = COALESCE($2, active)
     WHERE id = $3`,
    [patch.bonus_percent ?? null, patch.active ?? null, id]
  );
}

export async function listCreatorCodesAdmin(
  client: Queryable = pool
): Promise<(CreatorCode & { owner_username: string; used_by_count: number })[]> {
  const { rows } = await client.query(`
    SELECT cc.*, u.username AS owner_username,
      (SELECT COUNT(*) FROM users WHERE creator_code_id = cc.id) AS used_by_count
    FROM creator_codes cc JOIN users u ON u.id = cc.owner_user_id
    ORDER BY cc.created_at DESC
  `);
  return rows;
}

export async function getCreatorForUser(
  userId: string,
  client: Queryable = pool
): Promise<{ id: string; owner_user_id: string; bonus_percent: number } | undefined> {
  const { rows } = await client.query(
    `SELECT u.id, cc.owner_user_id, cc.bonus_percent FROM users u
     JOIN creator_codes cc ON cc.id = u.creator_code_id
     WHERE u.id = $1 AND cc.active = 1`,
    [userId]
  );
  return rows[0];
}

export async function sumCreatorBonusEarned(ownerUserId: string, client: Queryable = pool): Promise<number> {
  const { rows } = await client.query(
    `SELECT COALESCE(SUM(amount), 0)::int AS total FROM coin_ledger WHERE user_id = $1 AND reason = 'creator_bonus'`,
    [ownerUserId]
  );
  return Number(rows[0].total);
}
