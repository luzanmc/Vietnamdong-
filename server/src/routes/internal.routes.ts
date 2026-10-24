import { Router } from 'express';
import { env } from '../config/env.js';
import { pool } from '../db/database.js';
import { auditService } from '../services/auditService.js';

export const internalRouter = Router();

internalRouter.all('/purge-deleted', async (req, res, next) => {
  try {
    const cronSecretHeader = req.headers['cron-secret'];
    const authHeader = req.headers.authorization;
    const isAuthorized =
      Boolean(env.cronSecret) &&
      (cronSecretHeader === env.cronSecret || authHeader === `Bearer ${env.cronSecret}`);

    if (!isAuthorized) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { rows: usersToPurge } = await pool.query<{ id: string; username: string }>(
      `SELECT id, username FROM users
       WHERE deletion_requested_at IS NOT NULL AND deletion_requested_at <= now() - interval '7 days'`
    );

    let purgedCount = 0;
    for (const u of usersToPurge) {
      const anonUsername = 'deleted_' + u.id.slice(0, 8);

      await pool.query(
        `UPDATE users
         SET email = NULL,
             google_sub = NULL,
             discord_id = NULL,
             username = $1,
             avatar_url = NULL,
             password_hash = NULL,
             deleted_at = now(),
             deletion_requested_at = NULL
         WHERE id = $2`,
        [anonUsername, u.id]
      );

      await pool.query('DELETE FROM totp_secrets WHERE user_id = $1', [u.id]);
      await pool.query('DELETE FROM totp_recovery_codes WHERE user_id = $1', [u.id]);
      await pool.query('UPDATE user_sessions SET revoked_at = now() WHERE user_id = $1', [u.id]);

      void auditService.record(u.id, 'PURGE_DELETED_ACCOUNT_CRON', u.id, { username: anonUsername });
      purgedCount++;
    }

    res.json({ ok: true, purgedCount });
  } catch (err) {
    next(err);
  }
});
