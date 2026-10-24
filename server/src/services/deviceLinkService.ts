import crypto from 'crypto';
import { nanoid } from 'nanoid';
import { pool } from '../db/database.js';
import { env } from '../config/env.js';
import { hashIp, maskIp } from '../utils/ip.js';
import { sendAlert } from './discordService.js';

export function hashDeviceFingerprint(rawFp: string): string {
  return crypto.createHmac('sha256', env.jwtSecret).update(rawFp.trim()).digest('hex');
}

export async function recordDeviceLink(userId: string, rawFp: string | undefined, ip: string): Promise<void> {
  if (!rawFp || typeof rawFp !== 'string' || !rawFp.trim()) return;
  const fpHash = hashDeviceFingerprint(rawFp);
  const ipHash = hashIp(ip);

  try {
    await pool.query(
      `INSERT INTO device_links (id, user_id, fp_hash, ip_hash, first_seen, last_seen)
       VALUES ($1, $2, $3, $4, now(), now())
       ON CONFLICT (user_id, fp_hash)
       DO UPDATE SET last_seen = now(), ip_hash = EXCLUDED.ip_hash`,
      [nanoid(), userId, fpHash, ipHash]
    );

    const { rows } = await pool.query<{ count: string }>(
      `SELECT COUNT(DISTINCT user_id) AS count FROM device_links WHERE fp_hash = $1`,
      [fpHash]
    );
    const count = Number(rows[0]?.count || 0);

    if (count >= 3) {
      sendAlert(
        'device_multi_account',
        'Phát hiện thiết bị dùng chung cho nhiều tài khoản',
        [
          { name: 'Số tài khoản liên kết', value: String(count), inline: true },
          { name: 'Device Fingerprint', value: fpHash.slice(0, 12) + '...', inline: true },
          { name: 'IP mạng', value: maskIp(ip), inline: true },
          { name: 'Khuyến nghị', value: 'Quản trị viên kiểm tra mục Tài khoản liên quan', inline: false },
        ],
        fpHash,
        'warning'
      ).catch(() => {});
    }
  } catch (err) {
    console.error('recordDeviceLink error:', (err as Error).message);
  }
}

export async function countAccountsOnDevice(rawFp: string | undefined): Promise<number> {
  if (!rawFp || typeof rawFp !== 'string' || !rawFp.trim()) return 0;
  const fpHash = hashDeviceFingerprint(rawFp);
  const { rows } = await pool.query<{ count: string }>(
    `SELECT COUNT(DISTINCT user_id) AS count FROM device_links WHERE fp_hash = $1`,
    [fpHash]
  );
  return Number(rows[0]?.count || 0);
}

export async function countAccountsOnIp(ip: string): Promise<number> {
  const ipHash = hashIp(ip);
  const { rows } = await pool.query<{ count: string }>(
    `SELECT COUNT(DISTINCT user_id) AS count FROM device_links WHERE ip_hash = $1`,
    [ipHash]
  );
  return Number(rows[0]?.count || 0);
}
