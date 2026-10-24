import { pool, type Queryable } from '../db/database.js';

export async function getAdminTotpAttempt(adminId: string, client: Queryable = pool): Promise<{
  failed_attempts: number;
  locked_until: Date | null;
} | null> {
  const { rows } = await client.query<{ failed_attempts: number; locked_until: Date | null }>(
    'SELECT failed_attempts, locked_until FROM admin_totp_attempts WHERE admin_id = $1',
    [adminId]
  );
  if (!rows[0]) return null;
  return rows[0];
}

export async function recordAdminTotpFailure(
  adminId: string,
  client: Queryable = pool
): Promise<{ locked: boolean; attempts: number; lockedUntil: Date | null }> {
  const current = await getAdminTotpAttempt(adminId, client);
  const attempts = (current?.failed_attempts || 0) + 1;

  if (attempts >= 5) {
    const lockUntil = new Date(Date.now() + 15 * 60 * 1000);
    await client.query(
      `INSERT INTO admin_totp_attempts (admin_id, failed_attempts, locked_until, updated_at)
       VALUES ($1, $2, $3, now())
       ON CONFLICT (admin_id) DO UPDATE SET failed_attempts = $2, locked_until = $3, updated_at = now()`,
      [adminId, attempts, lockUntil]
    );
    return { locked: true, attempts, lockedUntil: lockUntil };
  }

  await client.query(
    `INSERT INTO admin_totp_attempts (admin_id, failed_attempts, locked_until, updated_at)
     VALUES ($1, $2, NULL, now())
     ON CONFLICT (admin_id) DO UPDATE SET failed_attempts = $2, locked_until = NULL, updated_at = now()`,
    [adminId, attempts]
  );
  return { locked: false, attempts, lockedUntil: null };
}

export async function resetAdminTotpFailure(adminId: string, client: Queryable = pool): Promise<void> {
  await client.query(
    `INSERT INTO admin_totp_attempts (admin_id, failed_attempts, locked_until, updated_at)
     VALUES ($1, 0, NULL, now())
     ON CONFLICT (admin_id) DO UPDATE SET failed_attempts = 0, locked_until = NULL, updated_at = now()`,
    [adminId]
  );
}
