import { pool, type Queryable } from '../db/database.js';
import type { CoinLedgerEntry, Withdrawal, WithdrawMethod, PayoutAccount, PayoutAccountSafe } from '../types/index.js';

export async function getLedgerForUser(userId: string, limit = 50, client: Queryable = pool): Promise<CoinLedgerEntry[]> {
  const { rows } = await client.query(
    `SELECT amount, reason, ref_id, created_at FROM coin_ledger
     WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [userId, limit]
  );
  return rows;
}

export async function getFilteredLedgerForUser(
  userId: string,
  filters: { reason?: string; from?: string; to?: string; page: number; pageSize: number },
  client: Queryable = pool
): Promise<{ items: CoinLedgerEntry[]; total: number }> {
  const conditions: string[] = ['user_id = $1'];
  const params: unknown[] = [userId];

  if (filters.reason) {
    params.push(filters.reason);
    conditions.push(`reason = $${params.length}`);
  }
  if (filters.from) {
    params.push(filters.from);
    conditions.push(`created_at >= $${params.length}`);
  }
  if (filters.to) {
    params.push(filters.to);
    conditions.push(`created_at <= $${params.length}`);
  }

  const where = conditions.join(' AND ');
  const countResult = await client.query(`SELECT COUNT(*) AS c FROM coin_ledger WHERE ${where}`, params);

  const offset = (filters.page - 1) * filters.pageSize;
  params.push(filters.pageSize, offset);
  const { rows } = await client.query(
    `SELECT amount, reason, ref_id, created_at FROM coin_ledger
     WHERE ${where} ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return { items: rows, total: Number(countResult.rows[0].c) };
}

export async function createWithdrawal(
  id: string,
  userId: string,
  amountNova: number,
  amountVnd: number,
  method: WithdrawMethod,
  destination: string,
  riskScore = 0,
  riskReasons: string[] = [],
  needsReview = false,
  payoutAccountId: string | null = null,
  client: Queryable = pool
): Promise<void> {
  await client.query(
    `INSERT INTO withdrawals (id, user_id, amount_nova, amount_vnd, method, destination, risk_score, risk_reasons, needs_review, payout_account_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [id, userId, amountNova, amountVnd, method, destination, riskScore, JSON.stringify(riskReasons), needsReview, payoutAccountId]
  );
}

export async function listWithdrawalsForUser(userId: string, client: Queryable = pool): Promise<Partial<Withdrawal>[]> {
  const { rows } = await client.query(
    `SELECT id, amount_nova, amount_vnd, method, destination, status, created_at FROM withdrawals
     WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return rows;
}

export async function listAllWithdrawalsAdmin(
  filter?: { status?: string; needs_review?: boolean; sortBy?: 'date' | 'risk' | 'amount' },
  client: Queryable = pool
): Promise<(Withdrawal & { username: string })[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filter?.status) {
    params.push(filter.status);
    conditions.push(`w.status = $${params.length}`);
  }
  if (filter?.needs_review) {
    conditions.push(`(w.needs_review = true OR w.risk_score >= 50)`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  let orderClause = `ORDER BY CASE w.status WHEN 'pending' THEN 0 ELSE 1 END, w.created_at DESC`;
  if (filter?.sortBy === 'risk') {
    orderClause = `ORDER BY w.risk_score DESC, w.created_at DESC`;
  } else if (filter?.sortBy === 'amount') {
    orderClause = `ORDER BY w.amount_nova DESC, w.created_at DESC`;
  }

  const { rows } = await client.query(
    `SELECT w.*, u.username FROM withdrawals w
     JOIN users u ON u.id = w.user_id
     ${where}
     ${orderClause}`,
    params
  );
  return rows;
}

export async function getPendingWithdrawal(id: string, client: Queryable = pool): Promise<Withdrawal | undefined> {
  const { rows } = await client.query(`SELECT * FROM withdrawals WHERE id = $1 AND status = 'pending'`, [id]);
  return rows[0];
}

export async function markWithdrawalPaid(id: string, note: string | null, adminId: string | null = null, client: Queryable = pool): Promise<void> {
  await client.query(
    `UPDATE withdrawals SET status = 'paid', processed_at = now(), admin_note = $1, admin_id = COALESCE($3, admin_id) WHERE id = $2 AND status = 'pending'`,
    [note, id, adminId]
  );
}

export async function markWithdrawalRejected(id: string, note: string, adminId: string | null = null, client: Queryable = pool): Promise<void> {
  await client.query(`UPDATE withdrawals SET status = 'rejected', processed_at = now(), admin_note = $1, admin_id = COALESCE($3, admin_id) WHERE id = $2`, [
    note,
    id,
    adminId,
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

export async function listPayoutAccountsForUser(userId: string, client: Queryable = pool): Promise<PayoutAccountSafe[]> {
  const { rows } = await client.query<PayoutAccount>(
    `SELECT id, type, bank_name, account_name, last4, status, created_at, email_confirmed_at, active_from
     FROM payout_accounts
     WHERE user_id = $1 AND status != 'removed'
     ORDER BY created_at DESC`,
    [userId]
  );
  const now = Date.now();
  return rows.map((r) => {
    const isWaiting = r.status === 'waiting';
    const activeFromMs = r.active_from ? new Date(r.active_from).getTime() : 0;
    const isActive = r.status === 'active' || (isWaiting && activeFromMs <= now);
    const hoursUntilActive = isWaiting && activeFromMs > now ? Math.ceil((activeFromMs - now) / (1000 * 60 * 60)) : undefined;
    return {
      id: r.id,
      type: r.type,
      bank_name: r.bank_name,
      account_name: r.account_name,
      last4: r.last4,
      status: r.status,
      created_at: r.created_at,
      email_confirmed_at: r.email_confirmed_at,
      active_from: r.active_from,
      isActive,
      hoursUntilActive,
    };
  });
}

export async function getPayoutAccountById(id: string, userId: string, client: Queryable = pool): Promise<PayoutAccount | null> {
  const { rows } = await client.query<PayoutAccount>(
    `SELECT * FROM payout_accounts WHERE id = $1 AND user_id = $2 AND status != 'removed'`,
    [id, userId]
  );
  return rows[0] || null;
}

export async function countUserPayoutAccounts(userId: string, client: Queryable = pool): Promise<number> {
  const { rows } = await client.query<{ c: string }>(
    `SELECT COUNT(*) AS c FROM payout_accounts WHERE user_id = $1 AND status != 'removed'`,
    [userId]
  );
  return Number(rows[0]?.c || 0);
}

export async function removePayoutAccount(id: string, userId: string, client: Queryable = pool): Promise<boolean> {
  const res = await client.query(
    `UPDATE payout_accounts SET status = 'removed' WHERE id = $1 AND user_id = $2 AND status != 'removed'`,
    [id, userId]
  );
  return (res.rowCount ?? 0) > 0;
}

export async function getUserTotalWithdrawn24h(userId: string, client: Queryable = pool): Promise<number> {
  const { rows } = await client.query<{ total: string }>(
    `SELECT COALESCE(SUM(amount_nova), 0) AS total
     FROM withdrawals
     WHERE user_id = $1
       AND status IN ('pending', 'paid', 'approved', 'completed')
       AND created_at >= now() - interval '24 hours'`,
    [userId]
  );
  return Number(rows[0]?.total || 0);
}
