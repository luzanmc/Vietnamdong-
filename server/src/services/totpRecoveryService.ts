import crypto from 'node:crypto';
import { nanoid } from 'nanoid';
import { env } from '../config/env.js';
import { pool } from '../db/database.js';

const CODE_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

export function generateSingleRecoveryCode(): string {
  const bytes = crypto.randomBytes(10);
  let p1 = '';
  let p2 = '';
  for (let i = 0; i < 5; i++) p1 += CODE_CHARS[bytes[i] % CODE_CHARS.length];
  for (let i = 5; i < 10; i++) p2 += CODE_CHARS[bytes[i] % CODE_CHARS.length];
  return `${p1}-${p2}`;
}

export function hashRecoveryCode(code: string): string {
  const clean = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const formatted = clean.length === 10 ? `${clean.slice(0, 5)}-${clean.slice(5)}` : clean;
  return crypto.createHash('sha256').update(`${formatted}:${env.jwtSecret}`).digest('hex');
}

export async function generateAndSaveRecoveryCodes(userId: string): Promise<string[]> {
  await pool.query('DELETE FROM totp_recovery_codes WHERE user_id = $1', [userId]);

  const codes: string[] = [];
  for (let i = 0; i < 8; i++) {
    codes.push(generateSingleRecoveryCode());
  }

  for (const c of codes) {
    const codeHash = hashRecoveryCode(c);
    await pool.query(
      `INSERT INTO totp_recovery_codes (id, user_id, code_hash, created_at)
       VALUES ($1, $2, $3, now())`,
      [nanoid(), userId, codeHash]
    );
  }

  return codes;
}

export async function countRemainingRecoveryCodes(userId: string): Promise<number> {
  const { rows } = await pool.query<{ c: string }>(
    'SELECT COUNT(*) as c FROM totp_recovery_codes WHERE user_id = $1 AND used_at IS NULL',
    [userId]
  );
  return Number(rows[0]?.c || 0);
}

export async function checkTotpLockout(userId: string): Promise<{ locked: boolean; minutesRemaining: number }> {
  const { rows } = await pool.query<{ failed_attempts: number; locked_until: string | null }>(
    'SELECT failed_attempts, locked_until FROM totp_failed_attempts WHERE user_id = $1',
    [userId]
  );
  if (!rows[0] || !rows[0].locked_until) return { locked: false, minutesRemaining: 0 };

  const lockedUntil = new Date(rows[0].locked_until).getTime();
  const now = Date.now();
  if (lockedUntil > now) {
    return { locked: true, minutesRemaining: Math.ceil((lockedUntil - now) / 60000) };
  }
  return { locked: false, minutesRemaining: 0 };
}

export async function recordTotpFailure(userId: string): Promise<{ locked: boolean; attempts: number }> {
  const res = await pool.query<{ failed_attempts: number; locked_until: string | null }>(
    `INSERT INTO totp_failed_attempts (user_id, failed_attempts, locked_until, updated_at)
     VALUES ($1, 1, NULL, now())
     ON CONFLICT (user_id) DO UPDATE SET
       failed_attempts = totp_failed_attempts.failed_attempts + 1,
       locked_until = CASE WHEN totp_failed_attempts.failed_attempts + 1 >= 5 THEN now() + interval '15 minutes' ELSE NULL END,
       updated_at = now()
     RETURNING failed_attempts, locked_until`,
    [userId]
  );
  const row = res.rows[0];
  const isLocked = Boolean(row.locked_until && new Date(row.locked_until).getTime() > Date.now());
  return { locked: isLocked, attempts: row.failed_attempts };
}

export async function resetTotpFailures(userId: string): Promise<void> {
  await pool.query(
    `INSERT INTO totp_failed_attempts (user_id, failed_attempts, locked_until, updated_at)
     VALUES ($1, 0, NULL, now())
     ON CONFLICT (user_id) DO UPDATE SET failed_attempts = 0, locked_until = NULL, updated_at = now()`,
    [userId]
  );
}

export async function verifyAndUseRecoveryCode(userId: string, inputCode: string): Promise<{ ok: boolean; remainingCount: number }> {
  const codeHash = hashRecoveryCode(inputCode);
  const { rows } = await pool.query<{ id: string }>(
    `SELECT id FROM totp_recovery_codes
     WHERE user_id = $1 AND code_hash = $2 AND used_at IS NULL
     LIMIT 1`,
    [userId, codeHash]
  );

  if (rows.length === 0) {
    return { ok: false, remainingCount: 0 };
  }

  await pool.query('UPDATE totp_recovery_codes SET used_at = now() WHERE id = $1', [rows[0].id]);
  const remaining = await countRemainingRecoveryCodes(userId);
  return { ok: true, remainingCount: remaining };
}
