import { pool, type Queryable } from '../db/database.js';
import type { RedeemItem, RedeemOrder } from '../types/index.js';

export async function listActiveRedeemItems(client: Queryable = pool): Promise<RedeemItem[]> {
  const { rows } = await client.query('SELECT * FROM redeem_items WHERE active = 1 ORDER BY category, sort_order');
  return rows;
}

export async function getActiveRedeemItem(id: string, client: Queryable = pool): Promise<RedeemItem | undefined> {
  const { rows } = await client.query('SELECT * FROM redeem_items WHERE id = $1 AND active = 1', [id]);
  return rows[0];
}

export async function createRedeemOrder(
  id: string,
  userId: string,
  itemId: string,
  destination: string,
  priceNova: number,
  client: Queryable = pool
): Promise<void> {
  await client.query(
    `INSERT INTO redeem_orders (id, user_id, item_id, destination, price_nova) VALUES ($1, $2, $3, $4, $5)`,
    [id, userId, itemId, destination, priceNova]
  );
}

export async function markRedeemOrderFulfilled(id: string, resultData: string, client: Queryable = pool): Promise<void> {
  await client.query(
    `UPDATE redeem_orders SET status = 'fulfilled', processed_at = now(), result_data = $1 WHERE id = $2 AND status = 'pending'`,
    [resultData, id]
  );
}

export async function markRedeemOrderRejected(
  id: string,
  resultData: string | null,
  note: string,
  client: Queryable = pool
): Promise<void> {
  await client.query(
    `UPDATE redeem_orders SET status = 'rejected', processed_at = now(), result_data = $1, admin_note = $2 WHERE id = $3`,
    [resultData, note, id]
  );
}

export async function setRedeemOrderResultData(id: string, resultData: string, client: Queryable = pool): Promise<void> {
  await client.query(`UPDATE redeem_orders SET result_data = $1 WHERE id = $2`, [resultData, id]);
}

export async function listRedeemOrdersForUser(
  userId: string,
  client: Queryable = pool
): Promise<(Partial<RedeemOrder> & { label: string; category: string })[]> {
  const { rows } = await client.query(
    `SELECT o.id, o.price_nova, o.status, o.result_data, o.created_at, i.label, i.category
     FROM redeem_orders o JOIN redeem_items i ON i.id = o.item_id
     WHERE o.user_id = $1 ORDER BY o.created_at DESC`,
    [userId]
  );
  return rows;
}

export async function listAllRedeemOrdersAdmin(
  client: Queryable = pool
): Promise<(RedeemOrder & { username: string; label: string; category: string; requires_field: string })[]> {
  const { rows } = await client.query(`
    SELECT o.*, u.username, i.label, i.category, i.requires_field FROM redeem_orders o
    JOIN users u ON u.id = o.user_id
    JOIN redeem_items i ON i.id = o.item_id
    ORDER BY CASE o.status WHEN 'pending' THEN 0 ELSE 1 END, o.created_at DESC
  `);
  return rows;
}

export async function getPendingRedeemOrder(id: string, client: Queryable = pool): Promise<RedeemOrder | undefined> {
  const { rows } = await client.query(`SELECT * FROM redeem_orders WHERE id = $1 AND status = 'pending'`, [id]);
  return rows[0];
}

export async function findPendingOrderByRequestOrTrans(
  requestId: string,
  transId: string,
  client: Queryable = pool
): Promise<RedeemOrder | undefined> {
  const { rows } = await client.query(
    `SELECT * FROM redeem_orders
     WHERE status = 'pending'
       AND (result_data LIKE '%' || $1 || '%' OR result_data LIKE '%' || $2 || '%')`,
    [requestId, transId]
  );
  return rows[0];
}
