import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { pool } from '../db/database.js';
import { hashIp, maskIp } from '../utils/ip.js';
import { env } from '../config/env.js';
import { sendAlert } from '../services/discordService.js';

export interface SmartRateLimitOptions {
  name: string;
  windowSeconds?: number;
  maxRequests?: number;
  accountIdentifier?: (req: Request) => string | undefined;
}

function hashIdentifier(val: string): string {
  return crypto.createHmac('sha256', env.jwtSecret).update(val.toLowerCase().trim()).digest('hex');
}

export function smartRateLimit(options: SmartRateLimitOptions) {
  const windowSeconds = options.windowSeconds || 60;
  const maxRequests = options.maxRequests || 10;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ip = req.ip || '127.0.0.1';
      const ipHash = hashIp(ip);
      const ipKey = `${options.name}:ip:${ipHash}`;

      let accId: string | undefined;
      if (options.accountIdentifier) {
        accId = options.accountIdentifier(req);
      } else if (req.user?.id) {
        accId = req.user.id;
      } else if (req.body?.email && typeof req.body.email === 'string') {
        accId = hashIdentifier(req.body.email);
      } else if (req.body?.username && typeof req.body.username === 'string') {
        accId = hashIdentifier(req.body.username);
      }

      const keysToCheck: string[] = [ipKey];
      if (accId) {
        keysToCheck.push(`${options.name}:acc:${accId}`);
      }

      const { rows: penaltyRows } = await pool.query<{ key: string; locked_until: string; violation_level: number }>(
        `SELECT key, locked_until, violation_level FROM rate_limit_penalties
         WHERE key = ANY($1) AND locked_until > now()
         ORDER BY locked_until DESC LIMIT 1`,
        [keysToCheck]
      );

      if (penaltyRows.length > 0) {
        const lockedUntil = new Date(penaltyRows[0].locked_until).getTime();
        const retryAfter = Math.max(1, Math.ceil((lockedUntil - Date.now()) / 1000));
        const minutes = Math.ceil(retryAfter / 60);
        res.setHeader('Retry-After', String(retryAfter));
        return res.status(429).json({
          error: `Bạn đã thao tác quá nhiều lần. Vui lòng thử lại sau ${minutes} phút.`,
        });
      }

      const windowStartMs = Math.floor(Date.now() / (windowSeconds * 1000)) * (windowSeconds * 1000);
      const windowStart = new Date(windowStartMs).toISOString();

      let violatedKey: string | null = null;

      for (const key of keysToCheck) {
        const { rows } = await pool.query<{ count: number }>(
          `INSERT INTO rate_limit_counters (key, window_start, count)
           VALUES ($1, $2, 1)
           ON CONFLICT (key, window_start)
           DO UPDATE SET count = rate_limit_counters.count + 1
           RETURNING count`,
          [key, windowStart]
        );

        const currentCount = Number(rows[0]?.count || 1);
        if (currentCount > maxRequests) {
          violatedKey = key;
          break;
        }
      }

      if (violatedKey) {
        const { rows: penaltyRes } = await pool.query<{ violation_level: number; locked_until: string }>(
          `INSERT INTO rate_limit_penalties (key, violation_level, locked_until, updated_at)
           VALUES ($1, 1, now() + interval '1 minute', now())
           ON CONFLICT (key) DO UPDATE SET
             violation_level = rate_limit_penalties.violation_level + 1,
             locked_until = now() + (
               CASE
                 WHEN rate_limit_penalties.violation_level + 1 = 1 THEN interval '1 minute'
                 WHEN rate_limit_penalties.violation_level + 1 = 2 THEN interval '5 minutes'
                 ELSE interval '15 minutes'
               END
             ),
             updated_at = now()
           RETURNING violation_level, locked_until`,
          [violatedKey]
        );

        const level = Number(penaltyRes[0]?.violation_level || 1);
        const lockedUntil = new Date(penaltyRes[0]?.locked_until || Date.now() + 60000).getTime();
        const retryAfter = Math.max(1, Math.ceil((lockedUntil - Date.now()) / 1000));
        const minutes = Math.ceil(retryAfter / 60);

        if (level >= 2) {
          sendAlert(
            'rate_limit_violation',
            'Phát hiện vi phạm giới hạn tốc độ lặp lại',
            [
              { name: 'Loại thao tác', value: options.name, inline: true },
              { name: 'Mức vi phạm', value: `Cấp độ ${level} (khóa ${minutes} phút)`, inline: true },
              { name: 'IP mạng', value: maskIp(ip), inline: true },
            ],
            violatedKey,
            'warning'
          ).catch(() => {});
        }

        res.setHeader('Retry-After', String(retryAfter));
        return res.status(429).json({
          error: `Bạn đã thao tác quá nhiều lần. Vui lòng thử lại sau ${minutes} phút.`,
        });
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}
