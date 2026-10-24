import { pool, type Queryable } from '../db/database.js';
import type { AdminAuditLog } from '../types/index.js';

export async function createAdminAuditLog(
  id: string,
  adminId: string,
  action: string,
  target?: string | null,
  payload?: string | null,
  ip?: string | null,
  hash?: string | null,
  prevHash?: string | null,
  client: Queryable = pool
): Promise<void> {
  await client.query(
    `INSERT INTO admin_audit_log (id, admin_id, action, target, payload, ip, hash, prev_hash, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now())`,
    [id, adminId, action, target ?? null, payload ?? null, ip ?? null, hash ?? null, prevHash ?? null]
  );
}

export async function listAdminAuditLogs(
  limit = 50,
  offset = 0,
  client: Queryable = pool
): Promise<{ rows: (AdminAuditLog & { admin_username: string })[]; total: number }> {
  const countRes = await client.query('SELECT COUNT(*) AS total FROM admin_audit_log');
  const total = Number(countRes.rows[0]?.total || 0);

  const { rows } = await client.query<AdminAuditLog & { admin_username: string }>(
    `SELECT l.id, l.admin_id, l.action, l.target, l.payload, l.ip, l.created_at, COALESCE(u.username, 'Admin') AS admin_username
     FROM admin_audit_log l
     LEFT JOIN users u ON u.id = l.admin_id
     ORDER BY l.created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

  return { rows, total };
}
