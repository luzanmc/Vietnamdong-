import { nanoid } from 'nanoid';
import { withTransaction, pool } from '../db/database.js';
import { HttpError } from '../utils/httpError.js';
import {
  getGiftcodeByCode,
  hasUserRedeemedGiftcode,
  recordGiftcodeRedemption,
  incrementGiftcodeUsedCount,
} from '../repositories/giftcodeRepository.js';
import { credit } from './coinService.js';
import { createNotification } from '../repositories/notificationRepository.js';
import { getUserById } from '../repositories/userRepository.js';
import { logToDiscord, sendAlert, maskIp } from './discordService.js';
import { hashIp } from '../utils/ip.js';

const UNIFORM_GIFTCODE_ERROR = 'Mã không hợp lệ hoặc không thể sử dụng';

export async function checkGiftcodeLock(userId: string, ip: string): Promise<void> {
  const ipHash = hashIp(ip);
  const userKey = `user:${userId}`;
  const ipKey = `ip:${ipHash}`;

  const { rows } = await pool.query<{ identifier: string; locked_until: string }>(
    `SELECT identifier, locked_until FROM giftcode_failures
     WHERE identifier IN ($1, $2) AND locked_until > now()
     ORDER BY locked_until DESC LIMIT 1`,
    [userKey, ipKey]
  );

  if (rows.length > 0) {
    const lockedUntil = new Date(rows[0].locked_until).getTime();
    const minutes = Math.max(1, Math.ceil((lockedUntil - Date.now()) / 60000));
    throw new HttpError(429, `Bạn đã nhập sai mã quá nhiều lần. Vui lòng thử lại sau ${minutes} phút.`);
  }
}

async function recordFailure(userId: string, ip: string): Promise<void> {
  const ipHash = hashIp(ip);
  const userKey = `user:${userId}`;
  const ipKey = `ip:${ipHash}`;

  for (const identifier of [userKey, ipKey]) {
    const { rows } = await pool.query<{ count: number; locked_until: string | null }>(
      `INSERT INTO giftcode_failures (id, identifier, count, locked_until, updated_at)
       VALUES ($1, $2, 1, NULL, now())
       ON CONFLICT (identifier) DO UPDATE SET
         count = giftcode_failures.count + 1,
         locked_until = CASE
           WHEN giftcode_failures.count + 1 >= 5 THEN now() + interval '15 minutes'
           ELSE giftcode_failures.locked_until
         END,
         updated_at = now()
       RETURNING count, locked_until`,
      [nanoid(), identifier]
    );

    const count = Number(rows[0]?.count || 1);
    if (count >= 5) {
      const user = await getUserById(userId);
      sendAlert(
        'giftcode_bruteforce',
        'Phát hiện hành vi dò mã Giftcode liên tục',
        [
          { name: 'Tài khoản', value: user?.username || userId, inline: true },
          { name: 'Số lần sai liên tiếp', value: String(count), inline: true },
          { name: 'IP mạng', value: maskIp(ip), inline: true },
          { name: 'Biện pháp', value: 'Khóa nhập mã 15 phút', inline: false },
        ],
        identifier,
        'danger'
      ).catch(() => {});
    }
  }
}

async function resetFailures(userId: string, ip: string): Promise<void> {
  const ipHash = hashIp(ip);
  const userKey = `user:${userId}`;
  const ipKey = `ip:${ipHash}`;

  await pool.query(
    `UPDATE giftcode_failures SET count = 0, locked_until = NULL, updated_at = now()
     WHERE identifier IN ($1, $2)`,
    [userKey, ipKey]
  );
}

export async function redeemGiftcode(userId: string, rawCode: string, ip: string): Promise<{ code: string; reward_nova: number }> {
  await checkGiftcodeLock(userId, ip);

  const code = (rawCode || '').trim().toUpperCase();
  if (!code) {
    await recordFailure(userId, ip);
    throw new HttpError(400, UNIFORM_GIFTCODE_ERROR);
  }

  const giftcode = await getGiftcodeByCode(code);
  if (!giftcode || !giftcode.active) {
    await recordFailure(userId, ip);
    throw new HttpError(400, UNIFORM_GIFTCODE_ERROR);
  }

  if (giftcode.expires_at && new Date(giftcode.expires_at) < new Date()) {
    await recordFailure(userId, ip);
    throw new HttpError(400, UNIFORM_GIFTCODE_ERROR);
  }

  if (giftcode.used_count >= giftcode.max_uses) {
    await recordFailure(userId, ip);
    throw new HttpError(400, UNIFORM_GIFTCODE_ERROR);
  }

  const alreadyClaimed = await hasUserRedeemedGiftcode(giftcode.id, userId);
  if (alreadyClaimed) {
    await recordFailure(userId, ip);
    throw new HttpError(400, UNIFORM_GIFTCODE_ERROR);
  }

  try {
    await withTransaction(async (tx) => {
      const hasClaimedInTx = await hasUserRedeemedGiftcode(giftcode.id, userId, tx);
      if (hasClaimedInTx) {
        throw new HttpError(400, UNIFORM_GIFTCODE_ERROR);
      }

      await incrementGiftcodeUsedCount(giftcode.id, tx);
      await recordGiftcodeRedemption(nanoid(), giftcode.id, userId, giftcode.reward_nova, tx);
      await credit(userId, giftcode.reward_nova, 'giftcode_reward', giftcode.id, tx);
    });
  } catch (err) {
    await recordFailure(userId, ip);
    throw (err instanceof HttpError) ? err : new HttpError(400, UNIFORM_GIFTCODE_ERROR);
  }

  await resetFailures(userId, ip);

  const user = await getUserById(userId);
  await createNotification(
    nanoid(),
    userId,
    `Nhận thành công +${giftcode.reward_nova} VNC từ mã Giftcode [${giftcode.code}].`,
    '/wallet'
  );

  logToDiscord(`[Giftcode] **${user?.username || userId}** nhập Giftcode **${giftcode.code}** (+${giftcode.reward_nova} VNC)`);

  return {
    code: giftcode.code,
    reward_nova: giftcode.reward_nova,
  };
}
