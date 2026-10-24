import crypto from 'node:crypto';
import { Router } from 'express';
import { nanoid } from 'nanoid';
import { env } from '../config/env.js';
import { pool } from '../db/database.js';
import { checkIsVpn } from '../services/vpnDetectionService.js';
import { requireAuth } from '../middleware/auth.js';
import { getUserById } from '../repositories/userRepository.js';
import { getTotp } from '../repositories/totpRepository.js';
import { verifyTotpCode } from '../utils/totp.js';
import { verifyAndUseRecoveryCode } from '../services/totpRecoveryService.js';
import { comparePassword, hashPassword } from '../services/passwordService.js';
import { validatePasswordPolicy } from '../services/passwordPolicyService.js';
import { invalidatePendingResetsForUser } from '../repositories/passwordResetRepository.js';
import { auditService } from '../services/auditService.js';
import { sendAlert } from '../services/discordService.js';
import { parseUserAgent } from '../utils/ip.js';
import {
  getUserActiveSessions,
  revokeSession,
  revokeAllOtherSessions,
  revokeAllSessionsForUser,
} from '../services/sessionService.js';

export const securityRouter = Router();

securityRouter.get('/network-status', async (req, res, next) => {
  try {
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
    const result = await checkIsVpn(clientIp);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

securityRouter.get('/account-token/:token', async (req, res, next) => {
  try {
    const token = String(req.params.token || '').trim();
    if (!token) {
      return res.status(400).json({ error: 'Mã xác thực không hợp lệ' });
    }
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const { rows } = await pool.query<{ id: string; user_id: string }>(
      `SELECT id, user_id FROM account_security_tokens
       WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()`,
      [tokenHash]
    );

    if (rows.length === 0) {
      return res.status(400).json({ error: 'Liên kết bảo mật không tồn tại hoặc đã hết hạn' });
    }

    const user = await getUserById(rows[0].user_id);
    res.json({ valid: true, username: user?.username || 'user' });
  } catch (err) {
    next(err);
  }
});

securityRouter.post('/trust-device', async (req, res, next) => {
  try {
    const token = String(req.body.token || '').trim();
    if (!token) {
      return res.status(400).json({ error: 'Mã xác thực không hợp lệ' });
    }
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const { rows } = await pool.query<{
      id: string;
      user_id: string;
      session_id: string | null;
      device_hash: string | null;
    }>(
      `SELECT id, user_id, session_id, device_hash FROM account_security_tokens
       WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()`,
      [tokenHash]
    );

    if (rows.length === 0) {
      return res.status(400).json({ error: 'Liên kết bảo mật không tồn tại hoặc đã hết hạn' });
    }

    const record = rows[0];
    await pool.query('UPDATE account_security_tokens SET used_at = now() WHERE id = $1', [record.id]);

    if (record.session_id) {
      await pool.query('UPDATE user_sessions SET trusted = TRUE WHERE id = $1', [record.session_id]);
    }
    if (record.device_hash) {
      await pool.query('UPDATE user_sessions SET trusted = TRUE WHERE user_id = $1 AND device_hash = $2', [
        record.user_id,
        record.device_hash,
      ]);
    }

    void auditService.record(record.user_id, 'TRUST_DEVICE', record.user_id);
    res.json({ ok: true, message: 'Đã đánh dấu thiết bị tin cậy thành công' });
  } catch (err) {
    next(err);
  }
});

securityRouter.post('/secure-account', async (req, res, next) => {
  try {
    const token = String(req.body.token || '').trim();
    const newPassword = String(req.body.newPassword || '');

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Vui lòng cung cấp đầy đủ thông tin mã xác thực và mật khẩu mới' });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const { rows } = await pool.query<{
      id: string;
      user_id: string;
    }>(
      `SELECT id, user_id FROM account_security_tokens
       WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()`,
      [tokenHash]
    );

    if (rows.length === 0) {
      return res.status(400).json({ error: 'Liên kết bảo mật không tồn tại hoặc đã hết hạn' });
    }

    const record = rows[0];
    const user = await getUserById(record.user_id);
    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy tài khoản' });
    }

    await validatePasswordPolicy(newPassword, { username: user.username, email: user.email ?? undefined });

    const passwordHash = await hashPassword(newPassword);

    await pool.query(
      `UPDATE users
       SET password_hash = $1,
           withdraw_locked_until = now() + interval '24 hours'
       WHERE id = $2`,
      [passwordHash, user.id]
    );

    await revokeAllSessionsForUser(user.id);
    await invalidatePendingResetsForUser(user.id);
    await pool.query('UPDATE account_security_tokens SET used_at = now() WHERE id = $1', [record.id]);

    await pool.query(
      `INSERT INTO security_flags (id, user_id, reason, created_at)
       VALUES ($1, $2, $3, now())`,
      [nanoid(), user.id, 'Người dùng xác nhận thiết bị lạ: thu hồi toàn bộ phiên, đổi mật khẩu và khóa rút tiền 24h']
    );

    void auditService.record(user.id, 'SECURE_ACCOUNT_LOCK_AND_RESET', user.id);

    sendAlert(
      'security_alert',
      'Cảnh báo bảo vệ tài khoản khẩn cấp',
      [
        { name: 'Tài khoản', value: `${user.username} (${user.id})`, inline: true },
        { name: 'Trạng thái', value: 'Đã thu hồi phiên, đổi mật khẩu, khóa rút tiền 24h', inline: true },
      ],
      user.id,
      'danger'
    ).catch(() => {});

    res.clearCookie('vnd_session', {
      httpOnly: true,
      secure: env.nodeEnv === 'production',
      sameSite: 'lax',
      path: '/',
    });

    res.json({
      ok: true,
      message: 'Tài khoản đã được bảo vệ thành công. Mọi phiên đăng nhập đã bị đăng xuất và rút tiền tạm khóa 24 giờ.',
    });
  } catch (err) {
    next(err);
  }
});

securityRouter.get('/sessions', requireAuth, async (req, res, next) => {
  try {
    const sessions = await getUserActiveSessions(req.user!.id, req.sessionId);
    res.json({ sessions });
  } catch (err) {
    next(err);
  }
});

securityRouter.post('/sessions/:id/revoke', requireAuth, async (req, res, next) => {
  try {
    const sessionId = req.params.id;
    const { rows } = await pool.query<{ user_id: string }>(
      'SELECT user_id FROM user_sessions WHERE id = $1',
      [sessionId]
    );

    if (rows.length === 0 || rows[0].user_id !== req.user!.id) {
      return res.status(404).json({ error: 'Không tìm thấy phiên đăng nhập' });
    }

    await revokeSession(sessionId);
    res.json({ ok: true, message: 'Đã đăng xuất thiết bị thành công' });
  } catch (err) {
    next(err);
  }
});

securityRouter.post('/sessions/revoke-others', requireAuth, async (req, res, next) => {
  try {
    if (req.sessionId) {
      await revokeAllOtherSessions(req.user!.id, req.sessionId);
    } else {
      await revokeAllSessionsForUser(req.user!.id);
    }
    res.json({ ok: true, message: 'Đã đăng xuất tất cả các thiết bị khác' });
  } catch (err) {
    next(err);
  }
});

securityRouter.get('/login-history', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query<{
      id: string;
      success: boolean;
      ip_masked: string;
      user_agent: string | null;
      created_at: string;
    }>(
      `SELECT id, success, ip_masked, user_agent, created_at
       FROM login_events
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 20`,
      [req.user!.id]
    );

    const events = rows.map((e) => {
      const parsed = parseUserAgent(e.user_agent || '');
      return {
        id: e.id,
        success: e.success,
        ipMasked: e.ip_masked,
        device: `${parsed.device} (${parsed.os})`,
        browser: parsed.browser,
        userAgent: e.user_agent,
        createdAt: e.created_at,
      };
    });

    res.json({ events });
  } catch (err) {
    next(err);
  }
});

securityRouter.post('/export-data', requireAuth, async (req, res, next) => {
  try {
    const { password, totpCode } = req.body;

    if (req.user!.password_hash) {
      if (!password) {
        return res.status(400).json({ error: 'Vui lòng nhập mật khẩu để xác nhận tải dữ liệu' });
      }
      const validPw = await comparePassword(password, req.user!.password_hash);
      if (!validPw) {
        return res.status(401).json({ error: 'Mật khẩu xác nhận không chính xác' });
      }
    }

    const totp = await getTotp(req.user!.id);
    if (totp?.enabled === 1) {
      const cleanCode = String(totpCode || '').trim();
      let ok = verifyTotpCode(totp.secret, cleanCode);
      if (!ok) {
        const recResult = await verifyAndUseRecoveryCode(req.user!.id, cleanCode);
        ok = recResult.ok;
      }
      if (!ok) {
        return res.status(401).json({ error: 'Mã xác thực 2 bước (2FA) hoặc mã khôi phục không chính xác' });
      }
    }

    if (req.user!.last_data_export_at) {
      const lastTime = new Date(req.user!.last_data_export_at).getTime();
      const diffMs = Date.now() - lastTime;
      const twentyFourHoursMs = 24 * 60 * 60 * 1000;
      if (diffMs < twentyFourHoursMs) {
        const hoursLeft = Math.ceil((twentyFourHoursMs - diffMs) / (60 * 60 * 1000));
        return res.status(429).json({
          error: `Bạn chỉ có thể tải dữ liệu cá nhân 1 lần mỗi 24 giờ. Vui lòng thử lại sau ${hoursLeft} giờ.`,
        });
      }
    }

    const profileData = {
      id: req.user!.id,
      username: req.user!.username,
      email: req.user!.email,
      email_verified: Boolean(req.user!.email_verified),
      role: req.user!.role,
      balance_nova: req.user!.balance_nova,
      total_redeemed_nova: req.user!.total_redeemed_nova,
      streak_days: req.user!.streak_days,
      xp: req.user!.xp,
      created_at: req.user!.created_at,
    };

    const ledgerRes = await pool.query<{
      id: string;
      amount: number;
      reason: string;
      ref_id: string | null;
      created_at: string;
    }>(
      'SELECT id, amount, reason, ref_id, created_at FROM coin_ledger WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user!.id]
    );

    const tasksRes = await pool.query<{
      id: string;
      task_id: string;
      status: string;
      created_at: string;
      completed_at: string | null;
    }>(
      'SELECT id, task_id, status, created_at, completed_at FROM task_attempts WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user!.id]
    );

    const withdrawalsRes = await pool.query<{
      id: string;
      amount_nova: number;
      amount_vnd: number;
      method: string;
      destination: string;
      status: string;
      created_at: string;
      processed_at: string | null;
    }>(
      'SELECT id, amount_nova, amount_vnd, method, destination, status, created_at, processed_at FROM withdrawals WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user!.id]
    );

    const safeWithdrawals = withdrawalsRes.rows.map((w) => {
      const dest = String(w.destination || '');
      const masked = dest.length > 4 ? `****${dest.slice(-4)}` : '****';
      return {
        ...w,
        destination: masked,
      };
    });

    const notifRes = await pool.query<{
      id: string;
      message: string;
      read: number;
      created_at: string;
    }>(
      'SELECT id, message, read, created_at FROM notifications WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user!.id]
    );

    const sessionsRes = await pool.query<{
      user_agent: string | null;
      ip_masked: string;
      country: string | null;
      created_at: string;
      last_seen_at: string;
    }>(
      'SELECT user_agent, ip_masked, country, created_at, last_seen_at FROM user_sessions WHERE user_id = $1 ORDER BY last_seen_at DESC',
      [req.user!.id]
    );

    const safeSessions = sessionsRes.rows.map((s) => {
      const parsed = parseUserAgent(s.user_agent || '');
      return {
        device: `${parsed.device} (${parsed.os})`,
        browser: parsed.browser,
        ipMasked: s.ip_masked,
        country: s.country,
        createdAt: s.created_at,
        lastSeenAt: s.last_seen_at,
      };
    });

    await pool.query('UPDATE users SET last_data_export_at = now() WHERE id = $1', [req.user!.id]);
    void auditService.record(req.user!.id, 'EXPORT_PERSONAL_DATA', req.user!.id);

    const exportPayload = {
      app: env.appName,
      exportedAt: new Date().toISOString(),
      profile: profileData,
      coinLedger: ledgerRes.rows,
      taskAttempts: tasksRes.rows,
      withdrawals: safeWithdrawals,
      notifications: notifRes.rows,
      deviceSummary: safeSessions,
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="vietnamdong-data-${req.user!.username}-${Date.now()}.json"`
    );
    res.send(JSON.stringify(exportPayload, null, 2));
  } catch (err) {
    next(err);
  }
});

securityRouter.post('/request-delete-account', requireAuth, async (req, res, next) => {
  try {
    const { password, totpCode, confirmUsername } = req.body;

    if (String(confirmUsername || '').trim() !== req.user!.username) {
      return res.status(400).json({ error: 'Tên đăng nhập xác nhận không trùng khớp' });
    }

    if (req.user!.password_hash) {
      if (!password) {
        return res.status(400).json({ error: 'Vui lòng nhập mật khẩu tài khoản' });
      }
      const validPw = await comparePassword(password, req.user!.password_hash);
      if (!validPw) {
        return res.status(401).json({ error: 'Mật khẩu xác nhận không chính xác' });
      }
    }

    const totp = await getTotp(req.user!.id);
    if (totp?.enabled === 1) {
      const cleanCode = String(totpCode || '').trim();
      let ok = verifyTotpCode(totp.secret, cleanCode);
      if (!ok) {
        const recResult = await verifyAndUseRecoveryCode(req.user!.id, cleanCode);
        ok = recResult.ok;
      }
      if (!ok) {
        return res.status(401).json({ error: 'Mã xác thực 2 bước (2FA) hoặc mã khôi phục không chính xác' });
      }
    }

    const pendingWithdrawal = await pool.query(
      "SELECT 1 FROM withdrawals WHERE user_id = $1 AND status = 'pending' LIMIT 1",
      [req.user!.id]
    );
    if (pendingWithdrawal.rows.length > 0) {
      return res.status(400).json({ error: 'Không thể xóa tài khoản khi đang có lệnh rút tiền chờ duyệt.' });
    }

    const pendingRedeem = await pool.query(
      "SELECT 1 FROM redeem_orders WHERE user_id = $1 AND status = 'pending' LIMIT 1",
      [req.user!.id]
    );
    if (pendingRedeem.rows.length > 0) {
      return res.status(400).json({ error: 'Không thể xóa tài khoản khi đang có yêu cầu đổi thưởng chờ xử lý.' });
    }

    const pendingVietsub = await pool.query(
      "SELECT 1 FROM vietsub_orders WHERE user_id = $1 AND status = 'pending' LIMIT 1",
      [req.user!.id]
    );
    if (pendingVietsub.rows.length > 0) {
      return res.status(400).json({ error: 'Không thể xóa tài khoản khi đang có đơn hàng Vietsub Studio chờ kích hoạt.' });
    }

    await pool.query('UPDATE users SET deletion_requested_at = now() WHERE id = $1', [req.user!.id]);
    await revokeAllSessionsForUser(req.user!.id);

    void auditService.record(req.user!.id, 'REQUEST_ACCOUNT_DELETION', req.user!.id);

    res.clearCookie('vnd_session', {
      httpOnly: true,
      secure: env.nodeEnv === 'production',
      sameSite: 'lax',
      path: '/',
    });

    res.json({
      ok: true,
      message: 'Yêu cầu xóa tài khoản đã được tiếp nhận. Bạn có 7 ngày để hủy yêu cầu bằng cách đăng nhập lại.',
    });
  } catch (err) {
    next(err);
  }
});
