import type { PoolClient } from 'pg';
import { pool, type Queryable } from '../db/database.js';

export interface VietsubLicense {
  id: string;
  license_key: string;
  status: 'available' | 'sold';
  sold_to_user_id: string | null;
  sold_at: string | null;
  created_at: string;
}

export interface VietsubOrder {
  id: string;
  user_id: string;
  payment_method: 'nova' | 'vnd';
  price_nova: number | null;
  price_vnd: number | null;
  status: 'pending' | 'fulfilled' | 'rejected';
  license_key_id: string | null;
  transfer_note: string | null;
  admin_note: string | null;
  created_at: string;
  processed_at: string | null;
}

export async function countAvailableLicenses(client: Queryable = pool): Promise<number> {
  const { rows } = await client.query(`SELECT COUNT(*) AS c FROM vietsub_licenses WHERE status = 'available'`);
  return Number(rows[0].c);
}

export async function addLicenseKeys(keys: string[], client: Queryable = pool): Promise<number> {
  let added = 0;
  for (const key of keys) {
    const trimmed = key.trim();
    if (!trimmed) continue;
    const { rowCount } = await client.query(
      `INSERT INTO vietsub_licenses (id, license_key) VALUES ($1, $2) ON CONFLICT (license_key) DO NOTHING`,
      [`vsl_${trimmed.replace(/[^a-zA-Z0-9]/g, '').slice(0, 40)}_${Date.now()}_${added}`, trimmed]
    );
    if (rowCount) added++;
  }
  return added;
}

export async function claimAvailableLicense(userId: string, client: PoolClient): Promise<VietsubLicense> {
  const { rows } = await client.query<VietsubLicense>(
    `UPDATE vietsub_licenses SET status = 'sold', sold_to_user_id = $1, sold_at = now()
     WHERE id = (SELECT id FROM vietsub_licenses WHERE status = 'available' LIMIT 1 FOR UPDATE SKIP LOCKED)
     RETURNING *`,
    [userId]
  );
  if (!rows[0]) throw new Error('Hết license key');
  return rows[0];
}

export async function listLicensesAdmin(client: Queryable = pool): Promise<VietsubLicense[]> {
  const { rows } = await client.query('SELECT * FROM vietsub_licenses ORDER BY created_at DESC LIMIT 500');
  return rows;
}

export async function createVietsubOrder(
  id: string,
  userId: string,
  paymentMethod: 'nova' | 'vnd',
  priceNova: number | null,
  priceVnd: number | null,
  transferNote: string | null,
  client: Queryable = pool
): Promise<void> {
  await client.query(
    `INSERT INTO vietsub_orders (id, user_id, payment_method, price_nova, price_vnd, transfer_note)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, userId, paymentMethod, priceNova, priceVnd, transferNote]
  );
}

export async function markVietsubOrderFulfilled(id: string, licenseKeyId: string, client: Queryable = pool): Promise<void> {
  await client.query(
    `UPDATE vietsub_orders SET status = 'fulfilled', license_key_id = $1, processed_at = now() WHERE id = $2`,
    [licenseKeyId, id]
  );
}

export async function markVietsubOrderRejected(id: string, note: string, client: Queryable = pool): Promise<void> {
  await client.query(
    `UPDATE vietsub_orders SET status = 'rejected', admin_note = $1, processed_at = now() WHERE id = $2`,
    [note, id]
  );
}

export async function getPendingVietsubOrder(id: string, client: Queryable = pool): Promise<VietsubOrder | undefined> {
  const { rows } = await client.query(`SELECT * FROM vietsub_orders WHERE id = $1 AND status = 'pending'`, [id]);
  return rows[0];
}

export async function listVietsubOrdersForUser(
  userId: string,
  client: Queryable = pool
): Promise<(VietsubOrder & { license_key: string | null })[]> {
  const { rows } = await client.query(
    `SELECT o.*, l.license_key FROM vietsub_orders o
     LEFT JOIN vietsub_licenses l ON l.id = o.license_key_id
     WHERE o.user_id = $1 ORDER BY o.created_at DESC`,
    [userId]
  );
  return rows;
}

export async function listAllVietsubOrdersAdmin(
  client: Queryable = pool
): Promise<(VietsubOrder & { username: string; email: string | null })[]> {
  const { rows } = await client.query(`
    SELECT o.*, u.username, u.email FROM vietsub_orders o
    JOIN users u ON u.id = o.user_id
    ORDER BY CASE o.status WHEN 'pending' THEN 0 ELSE 1 END, o.created_at DESC
  `);
  return rows;
}
