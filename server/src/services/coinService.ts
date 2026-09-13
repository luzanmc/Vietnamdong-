import { nanoid } from 'nanoid';
import { pool, withTransaction, type Queryable } from '../db/database.js';
import { HttpError } from '../utils/httpError.js';
import type { LedgerReason } from '../types/index.js';

export async function credit(
  userId: string,
  amount: number,
  reason: LedgerReason,
  refId: string | null = null,
  client?: Queryable
): Promise<void> {
  if (amount <= 0) throw new Error('credit amount must be positive');

  const run = async (c: Queryable) => {
    await c.query('UPDATE users SET balance_nova = balance_nova + $1 WHERE id = $2', [amount, userId]);
    await c.query('INSERT INTO coin_ledger (id, user_id, amount, reason, ref_id) VALUES ($1, $2, $3, $4, $5)', [
      nanoid(),
      userId,
      amount,
      reason,
      refId,
    ]);
  };

  if (client) {
    await run(client);
  } else {
    await withTransaction((tx) => run(tx));
  }
}

export async function debit(
  userId: string,
  amount: number,
  reason: LedgerReason,
  refId: string | null = null,
  client?: Queryable
): Promise<void> {
  if (amount <= 0) throw new Error('debit amount must be positive');

  const run = async (c: Queryable) => {
    const { rows } = await c.query<{ balance_nova: number }>('SELECT balance_nova FROM users WHERE id = $1 FOR UPDATE', [
      userId,
    ]);
    const user = rows[0];
    if (!user || user.balance_nova < amount) throw new HttpError(400, 'Số dư Nova không đủ');
    await c.query('UPDATE users SET balance_nova = balance_nova - $1 WHERE id = $2', [amount, userId]);
    await c.query('INSERT INTO coin_ledger (id, user_id, amount, reason, ref_id) VALUES ($1, $2, $3, $4, $5)', [
      nanoid(),
      userId,
      -amount,
      reason,
      refId,
    ]);
  };

  if (client) {
    await run(client);
  } else {
    await withTransaction((tx) => run(tx));
  }
}

export function novaToVnd(nova: number, rate: number): number {
  return Math.round(nova * rate);
}
