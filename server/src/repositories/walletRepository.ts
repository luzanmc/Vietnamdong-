import { pool, type Queryable } from '../db/database.js';
import type { CoinLedgerEntry, Withdrawal, WithdrawMethod } from '../types/index.js';

export async function getLedgerForUser(userId: string, limit = 50, client: Queryable = pool): Promise<CoinLedgerEntry[]> {
  const { rows } = await client.query(
    `SELECT amount, reason, ref_id, created_at FROM coin_ledger
     WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [userId, limit]
  );
  return rows;
}

export async function createWithdrawal(
  id: string,
  userId: string,
  amountNova: number,
  amountVnd: number,
  method: WithdrawMethod,
  destination: string,
  client: Queryable = pool
): Promise<void> {
  await client.query(
    `INSERT INTO withdrawals (id, user_id, amount_nova, amount_vnd, method, destination)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, userId, amountNova, amountVnd, method, destination]
  );
}

export async function listWithdrawalsForUser(userId: string, client: Queryable = pool): Promise<Partial<Withdrawal>[]> {
  const { rows } = await client.query(
    `SELECT id, amount_nova, amount_vnd, method, status, created_at FROM withdrawals
     WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return rows;
}

export async function listAllWithdrawalsAdmin(client: Queryable = pool): Promise<(Withdrawal & { username: string })[]> {
  const { rows } = await client.query(`
    SELECT w.*, u.username FROM withdrawals w
    JOIN users u ON u.id = w.user_id
    ORDER BY CASE w.status WHEN 'pending' THEN 0 ELSE 1 END, w.created_at DESC
  `);
  return rows;
}

export async function getPendingWithdrawal(id: string, client: Queryable = pool): Promise<Withdrawal | undefined> {
  const { rows } = await client.query(`SELECT * FROM withdrawals WHERE id = $1 AND status = 'pending'`, [id]);
  return rows[0];
}

export async function markWithdrawalPaid(id: string, note: string | null, client: Queryable = pool): Promise<void> {
  await client.query(
    `UPDATE withdrawals SET status = 'paid', processed_at = now(), admin_note = $1 WHERE id = $2 AND status = 'pending'`,
    [note, id]
  );
}

export async function markWithdrawalRejected(id: string, note: string, client: Queryable = pool): Promise<void> {
  await client.query(`UPDATE withdrawals SET status = 'rejected', processed_at = now(), admin_note = $1 WHERE id = $2`, [
    note,
    id,
  ]);
}

export async function createTransferRecord(
  id: string,
  fromUserId: string,
  toUserId: string,
  amount: number,
  client: Queryable = pool
): Promise<void> {
  await client.query('INSERT INTO transfers (id, from_user_id, to_user_id, amount_nova) VALUES ($1, $2, $3, $4)', [
    id,
    fromUserId,
    toUserId,
    amount,
  ]);
}

export async function countPendingWithdrawals(client: Queryable = pool): Promise<number> {
  const { rows } = await client.query(`SELECT COUNT(*) AS c FROM withdrawals WHERE status = 'pending'`);
  return Number(rows[0].c);
}
