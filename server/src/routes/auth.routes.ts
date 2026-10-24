import crypto from 'node:crypto';
import { Router } from 'express';
import type { Request, CookieOptions } from 'express';
import { nanoid } from 'nanoid';
import { OAuth2Client } from 'google-auth-library';
import { env } from '../config/env.js';
import {
  signSession,
  verifySession,
  signPendingTwoFactor,
  verifyPendingTwoFactor,
  signPendingOtp,
  verifyPendingOtp,
} from '../utils/jwt.js';
import { generateBase32Secret, verifyTotpCode, buildOtpAuthUri } from '../utils/totp.js';
import { getTotp, saveTotpSecret, enableTotp, deleteTotp } from '../repositories/totpRepository.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import {
  googleLoginSchema,
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../validators/auth.validators.js';
import { pool } from '../db/database.js';
import { getSetting } from '../repositories/settingsRepository.js';
import { sendAlert, maskIp } from '../services/discordService.js';
import { verifyTurnstile } from '../services/turnstileService.js';
import { hashPassword, comparePassword } from '../services/passwordService.js';
import { smartRateLimit } from '../middleware/smartRateLimit.js';
import { recordDeviceLink } from '../services/deviceLinkService.js';
import {
  sendPasswordResetEmail,
  sendVerificationEmail,
  sendCountryOtpEmail,
  sendEmailLoginCode,
  sendRecoveryCodeUsedEmail,
} from '../services/mailService.js';
import { calculateLevel } from '../services/levelService.js';
import {
  getUserByDiscordId,
  createUserFromDiscord,
  updateUserFromDiscord,
  getUserById,
  getUserByGoogleSub,
  createUserFromGoogle,
  getUserByEmail,
  getUserByUsername,
  createUserWithPassword,
  countUsersFromIpToday,
  setUserPasswordHash,
  markEmailVerified,
  updateUserAvatar,
  updateCardConfig,
} from '../repositories/userRepository.js';
import {
  createPasswordReset,
  findValidPasswordReset,
  markPasswordResetUsed,
  invalidatePendingResetsForUser,
} from '../repositories/passwordResetRepository.js';
import {
  createEmailVerification,
  findValidEmailVerification,
  markEmailVerificationUsed,
} from '../repositories/emailVerificationRepository.js';
import { createSession, recordLoginEvent, revokeSession } from '../services/sessionService.js';
import { validatePasswordPolicy } from '../services/passwordPolicyService.js';
import { auditService } from '../services/auditService.js';
import { getClientCountry, getClientIp, hashIp } from '../utils/ip.js';
import { createNotification } from '../repositories/notificationRepository.js';
import {
  checkTotpLockout,
  recordTotpFailure,
  resetTotpFailures,
  verifyAndUseRecoveryCode,
  generateAndSaveRecoveryCodes,
  countRemainingRecoveryCodes,
} from '../services/totpRecoveryService.js';
import type { User } from '../types/index.js';

export const authRouter = Router();
const googleClient = new OAuth2Client(env.google.clientId);

const cookieOpts: CookieOptions = {
  httpOnly: true,
  secure: env.nodeEnv === 'production',
  sameSite: 'lax',
  maxAge: 30 * 24 * 60 * 60 * 1000,
  path: '/',
};

function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local.slice(0, 2)}***${local.slice(-1)}@${domain}`;
}

async function handleUserAccountStatus(
  user: User
): Promise<{ blocked: boolean; errorResponse?: { status: number; body: any } }> {
  if (user.deleted_at) {
    return { blocked: true, errorResponse: { status: 401, body: { error: 'Tài khoản không tồn tại' } } };
  }

  if (user.deletion_requested_at) {
    const requestedTime = new Date(user.deletion_requested_at).getTime();
    const days = (Date.now() - requestedTime) / (1000 * 60 * 60 * 24);
    if (days >= 7) {
      const anonUsername = 'deleted_' + user.id.slice(0, 8);
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
        [anonUsername, user.id]
      );
      await pool.query('DELETE FROM totp_secrets WHERE user_id = $1', [user.id]);
      await pool.query('DELETE FROM totp_recovery_codes WHERE user_id = $1', [user.id]);
      await pool.query('UPDATE user_sessions SET revoked_at = now() WHERE user_id = $1', [user.id]);
      void auditService.record(user.id, 'PURGE_DELETED_ACCOUNT_LAZY', user.id, { username: anonUsername });
      return {
        blocked: true,
        errorResponse: { status: 401, body: { error: 'Tài khoản đã bị xóa vĩnh viễn sau thời hạn 7 ngày.' } },
      };
    } else {
      await pool.query('UPDATE users SET deletion_requested_at = NULL WHERE id = $1', [user.id]);
      void createNotification(
        nanoid(),
        user.id,
        'Yêu cầu xóa tài khoản của bạn đã được hủy do bạn vừa đăng nhập lại thành công.'
      );
      void auditService.record(user.id, 'CANCEL_ACCOUNT_DELETION', user.id);
    }
  }

  if (user.banned_at) {
    const isExpired = user.ban_expires_at && new Date(user.ban_expires_at) <= new Date();
    if (!isExpired) {
      const expiryStr = user.ban_expires_at ? new Date(user.ban_expires_at).toLocaleString('vi-VN') : 'Vĩnh viễn';
      const reasonStr = user.ban_reason ? ` Lý do: ${user.ban_reason}.` : '';
      return {
        blocked: true,
        errorResponse: {
          status: 403,
          body: {
            error: `Tài khoản của bạn đã bị khóa.${reasonStr} Thời hạn: ${expiryStr}.`,
            banned: true,
            reason: user.ban_reason,
            expiresAt: user.ban_expires_at,
          },
        },
      };
    }
  }

  return { blocked: false };
}

async function checkAbnormalCountry(
  userId: string,
  req: Request
): Promise<{ abnormal: boolean; country: string | null }> {
  const country = getClientCountry(req);
  if (!country) return { abnormal: false, country: null };

  const priorSessionsRes = await pool.query<{ count: string }>(
    'SELECT COUNT(*) as count FROM user_sessions WHERE user_id = $1',
    [userId]
  );
  const totalPrior = Number(priorSessionsRes.rows[0]?.count || 0);
  if (totalPrior === 0) {
    return { abnormal: false, country };
  }

  const { rows } = await pool.query<{ country: string }>(
    `SELECT DISTINCT UPPER(country) as country
     FROM user_sessions
     WHERE user_id = $1 AND country IS NOT NULL AND created_at >= now() - interval '90 days'`,
    [userId]
  );

  const trusted = rows.map((r) => r.country);
  if (trusted.length > 0 && !trusted.includes(country.toUpperCase())) {
    return { abnormal: true, country };
  }

  return { abnormal: false, country };
}

async function handleLoginFailure(userId: string | undefined, req: Request): Promise<void> {
  if (userId) {
    void recordLoginEvent(userId, false, req);
  }
  const { rows } = await pool.query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM login_events WHERE success = false AND created_at >= now() - interval '1 hour'`
  );
  const failedCount = Number(rows[0]?.count || 0);
  if (failedCount >= 10) {
    sendAlert(
      'failed_logins_spike',
      'Cảnh báo số lượt đăng nhập thất bại tăng đột biến',
      [
        { name: 'Số lần thất bại (1h)', value: String(failedCount), inline: true },
        { name: 'IP mạng', value: maskIp(req.ip || ''), inline: true },
        { name: 'Tài khoản mục tiêu', value: userId ? userId : 'Nhiều tài khoản', inline: true },
      ],
      'failed_logins_1h',
      'danger'
    ).catch(() => {});
  }
}

async function upsertUserFromDiscord(profile: { id: string; username: string; avatar_url: string | null }) {
  const existing = await getUserByDiscordId(profile.id);
  if (existing) {
    await updateUserFromDiscord(existing.id, profile.username, profile.avatar_url);
    return existing;
  }
  const id = nanoid();
  await createUserFromDiscord(id, profile.id, profile.username, profile.avatar_url);
  return (await getUserById(id))!;
}

authRouter.get('/discord', (req, res) => {
  const params = new URLSearchParams({
    client_id: env.discord.clientId ?? '',
    redirect_uri: env.discord.redirectUri ?? '',
    response_type: 'code',
    scope: 'identify',
  });
  res.redirect(`https://discord.com/api/oauth2/authorize?${params}`);
});

authRouter.get('/discord/callback', async (req, res, next) => {
  try {
    const code = req.query.code as string | undefined;
    if (!code) return res.redirect(`${env.clientUrl}/login?error=missing_code`);

    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: env.discord.clientId ?? '',
        client_secret: env.discord.clientSecret ?? '',
        grant_type: 'authorization_code',
        code,
        redirect_uri: env.discord.redirectUri ?? '',
      }),
    });
    const tokenData = (await tokenRes.json()) as { access_token?: string };
    if (!tokenData.access_token) return res.redirect(`${env.clientUrl}/login?error=oauth_failed`);

    const profileRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = (await profileRes.json()) as { id: string; username: string; avatar: string | null };

    const avatarUrl = profile.avatar ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png` : null;
    const user = await upsertUserFromDiscord({ id: profile.id, username: profile.username, avatar_url: avatarUrl });

    const statusCheck = await handleUserAccountStatus(user);
    if (statusCheck.blocked) {
      return res.redirect(`${env.clientUrl}/login?error=account_blocked`);
    }

    const sid = await createSession(user.id, req);
    recordDeviceLink(user.id, req.headers['x-device-id'] as string, req.ip || '').catch(() => {});
    void recordLoginEvent(user.id, true, req);
    res.cookie('vnd_session', signSession(user, sid), cookieOpts);
    res.redirect(`${env.clientUrl}/dashboard`);
  } catch (err) {
    next(err);
  }
});

authRouter.post('/google', validateBody(googleLoginSchema), async (req, res, next) => {
  try {
    const { credential } = req.body;
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: env.google.clientId });
    const payload = ticket.getPayload();
    if (!payload) throw new Error('Invalid Google credential');

    let user = await getUserByGoogleSub(payload.sub);
    if (!user) {
      const id = nanoid();
      await createUserFromGoogle(id, payload.sub, payload.name || payload.email || 'user', payload.picture ?? null);
      user = (await getUserById(id))!;
    }

    const statusCheck = await handleUserAccountStatus(user);
    if (statusCheck.blocked) {
      return res.status(statusCheck.errorResponse!.status).json(statusCheck.errorResponse!.body);
    }

    const sid = await createSession(user.id, req);
    recordDeviceLink(user.id, req.headers['x-device-id'] as string, req.ip || '').catch(() => {});
    void recordLoginEvent(user.id, true, req);
    res.cookie('vnd_session', signSession(user, sid), cookieOpts);
    res.json({ ok: true });
  } catch (err) {
    (err as any).status = 401;
    (err as any).publicMessage = 'Đăng nhập Google thất bại';
    next(err);
  }
});

authRouter.post('/register', smartRateLimit({ name: 'register', windowSeconds: 60, maxRequests: 5 }), validateBody(registerSchema), async (req, res, next) => {
  try {
    const { username, email, password, captchaToken } = req.body;

    const captchaOk = await verifyTurnstile(captchaToken, req.ip);
    if (!captchaOk) return res.status(400).json({ error: 'Xác thực Captcha thất bại, vui lòng thử lại' });

    await validatePasswordPolicy(password, { username, email });

    if (await getUserByEmail(email)) return res.status(409).json({ error: 'Email này đã được đăng ký' });
    if (await getUserByUsername(username)) return res.status(409).json({ error: 'Tên đăng nhập đã tồn tại' });

    const rawIp = req.ip || ((req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()) || null;
    const ipSalt = env.jwtSecret || 'vnc-ip-salt';
    const hashedIp = rawIp ? crypto.createHash('sha256').update(`${rawIp}:${ipSalt}`).digest('hex') : null;

    if (hashedIp) {
      const recentCount = await countUsersFromIpToday(hashedIp);
      if (recentCount >= env.security.maxRegistrationsPerIpPerDay) {
        return res.status(429).json({ error: 'Đã đạt giới hạn số tài khoản đăng ký từ địa chỉ này trong 24 giờ' });
      }
    }

    const id = nanoid();
    const passwordHash = await hashPassword(password);
    await createUserWithPassword(id, email, username, passwordHash, hashedIp);
    const user = (await getUserById(id))!;

    recordDeviceLink(user.id, req.headers['x-device-id'] as string, req.ip || '').catch(() => {});

    if (hashedIp) {
      const { rows: sameIpUsers } = await pool.query<{ id: string; username: string }>(
        `SELECT id, username FROM users WHERE registered_ip = $1 AND created_at >= now() - interval '24 hours'`,
        [hashedIp]
      );
      const thresholdSetting = await getSetting('alert_multi_account_threshold');
      const threshold = Number(thresholdSetting || 3);
      const enabledSetting = await getSetting('alert_multi_account_enabled');
      const alertEnabled = enabledSetting !== 'false' && enabledSetting !== '0';

      if (sameIpUsers.length >= threshold) {
        await pool.query(
          `INSERT INTO security_flags (id, user_id, reason, created_at) VALUES ($1, $2, $3, now())`,
          [nanoid(), id, 'Nhiều tài khoản tạo từ cùng địa chỉ trong 24 giờ']
        );

        if (alertEnabled) {
          const userIds = sameIpUsers.map((u) => u.id).join(', ');
          sendAlert(
            'multi_account',
            'Cảnh báo nhiều tài khoản mới từ cùng địa chỉ',
            [
              { name: 'Số lượng tài khoản (24h)', value: String(sameIpUsers.length), inline: true },
              { name: 'Tài khoản vừa tạo', value: `${user.username} (${user.id})`, inline: true },
              { name: 'Danh sách User ID', value: userIds.slice(0, 1000), inline: false },
              { name: 'Quản trị hệ thống', value: `${env.clientUrl}/admin`, inline: false },
            ],
            hashedIp,
            'warning'
          ).catch(() => {});
        }
      }
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await createEmailVerification(nanoid(), user.id, hashToken(rawToken), expiresAt);
    const verifyUrl = `${env.clientUrl}/api/auth/verify-email/${rawToken}`;
    sendVerificationEmail(email, verifyUrl).catch(() => {});

    const sid = await createSession(user.id, req);
    recordDeviceLink(user.id, req.headers['x-device-id'] as string, req.ip || '').catch(() => {});
    void recordLoginEvent(user.id, true, req);
    res.cookie('vnd_session', signSession(user, sid), cookieOpts);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/login', smartRateLimit({ name: 'login', windowSeconds: 60, maxRequests: 10 }), validateBody(loginSchema), async (req, res, next) => {
  try {
    const { email, password, captchaToken } = req.body;

    const captchaOk = await verifyTurnstile(captchaToken, req.ip);
    if (!captchaOk) return res.status(400).json({ error: 'Xác thực Captcha thất bại, vui lòng thử lại' });

    const identifier = String(email || '').trim();
    const user = identifier.includes('@')
      ? await getUserByEmail(identifier)
      : (await getUserByUsername(identifier)) || (await getUserByEmail(identifier));

    if (!user || !user.password_hash) {
      await handleLoginFailure(undefined, req);
      return res.status(401).json({ error: 'Tài khoản hoặc mật khẩu không đúng' });
    }

    const valid = await comparePassword(password, user.password_hash);
    if (!valid) {
      await handleLoginFailure(user.id, req);
      return res.status(401).json({ error: 'Tài khoản hoặc mật khẩu không đúng' });
    }

    const statusCheck = await handleUserAccountStatus(user);
    if (statusCheck.blocked) {
      return res.status(statusCheck.errorResponse!.status).json(statusCheck.errorResponse!.body);
    }

    const abnormalCheck = await checkAbnormalCountry(user.id, req);
    if (abnormalCheck.abnormal) {
      const totp = await getTotp(user.id);
      if (totp?.enabled === 1) {
        return res.json({
          requires2fa: true,
          pendingToken: signPendingTwoFactor(user.id),
          reason: 'abnormal_country',
          country: abnormalCheck.country,
        });
      }

      const otp = String(crypto.randomInt(100000, 1000000));
      const otpHash = crypto.createHash('sha256').update(`${otp}:${env.jwtSecret}`).digest('hex');

      await pool.query(
        "DELETE FROM email_auth_codes WHERE user_id = $1 AND purpose = 'country_verification'",
        [user.id]
      );

      await pool.query(
        `INSERT INTO email_auth_codes (id, user_id, email, code_hash, purpose, attempts, max_attempts, expires_at)
         VALUES ($1, $2, $3, $4, 'country_verification', 0, 5, now() + interval '10 minutes')`,
        [nanoid(), user.id, user.email || '', otpHash]
      );

      if (user.email) {
        sendCountryOtpEmail(user.email, { otp, country: abnormalCheck.country! }).catch(() => {});
      }

      const pendingToken = signPendingOtp(user.id, 'country_verification', abnormalCheck.country || undefined);
      return res.json({
        requiresEmailOtp: true,
        pendingToken,
        emailMasked: maskEmail(user.email || ''),
        message: `Phát hiện đăng nhập từ quốc gia mới (${abnormalCheck.country}). Mã xác minh đã được gửi đến email của bạn.`,
      });
    }

    const totp = await getTotp(user.id);
    if (totp?.enabled === 1) {
      return res.json({ requires2fa: true, pendingToken: signPendingTwoFactor(user.id) });
    }

    const sid = await createSession(user.id, req);
    recordDeviceLink(user.id, req.headers['x-device-id'] as string, req.ip || '').catch(() => {});
    void recordLoginEvent(user.id, true, req);
    res.cookie('vnd_session', signSession(user, sid), cookieOpts);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/login/verify-otp', async (req, res, next) => {
  try {
    const pendingToken = String(req.body.pendingToken || '');
    const code = String(req.body.code || '').trim();

    const pending = verifyPendingOtp(pendingToken);
    if (!pending || pending.purpose !== 'country_verification') {
      return res.status(401).json({ error: 'Phiên xác minh đã hết hạn, vui lòng đăng nhập lại' });
    }

    const { rows } = await pool.query<{
      id: string;
      code_hash: string;
      attempts: number;
      max_attempts: number;
    }>(
      `SELECT id, code_hash, attempts, max_attempts
       FROM email_auth_codes
       WHERE user_id = $1 AND purpose = 'country_verification' AND expires_at > now()`,
      [pending.uid]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Mã xác minh đã hết hạn hoặc không tồn tại. Vui lòng đăng nhập lại.' });
    }

    const record = rows[0];
    if (record.attempts >= record.max_attempts) {
      return res.status(429).json({ error: 'Bạn đã nhập sai mã xác minh quá 5 lần. Vui lòng đăng nhập lại.' });
    }

    const inputHash = crypto.createHash('sha256').update(`${code}:${env.jwtSecret}`).digest('hex');
    if (inputHash !== record.code_hash) {
      await pool.query('UPDATE email_auth_codes SET attempts = attempts + 1 WHERE id = $1', [record.id]);
      return res.status(401).json({ error: 'Mã xác minh không chính xác' });
    }

    await pool.query('DELETE FROM email_auth_codes WHERE id = $1', [record.id]);

    const user = await getUserById(pending.uid);
    if (!user) return res.status(401).json({ error: 'Tài khoản không tồn tại' });

    const statusCheck = await handleUserAccountStatus(user);
    if (statusCheck.blocked) {
      return res.status(statusCheck.errorResponse!.status).json(statusCheck.errorResponse!.body);
    }

    const sid = await createSession(user.id, req);
    recordDeviceLink(user.id, req.headers['x-device-id'] as string, req.ip || '').catch(() => {});
    void recordLoginEvent(user.id, true, req);
    res.cookie('vnd_session', signSession(user, sid), cookieOpts);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/login/2fa', async (req, res, next) => {
  try {
    const pendingToken = String(req.body.pendingToken || '');
    const code = String(req.body.code || '').trim();

    const pending = verifyPendingTwoFactor(pendingToken);
    if (!pending) return res.status(401).json({ error: 'Phiên xác thực đã hết hạn, vui lòng đăng nhập lại' });

    const lockout = await checkTotpLockout(pending.uid);
    if (lockout.locked) {
      return res.status(429).json({
        error: `Bạn đã nhập sai quá nhiều lần. Xác thực tạm khóa trong ${lockout.minutesRemaining} phút.`,
      });
    }

    const totp = await getTotp(pending.uid);
    if (!totp || totp.enabled !== 1) return res.status(400).json({ error: 'Tài khoản chưa bật xác thực 2 lớp' });

    let isSuccess = false;
    let usedRecoveryCode = false;
    let remainingCodesCount = 0;

    const cleanCode = code.toUpperCase().replace(/\s+/g, '');
    if (/^\d{6}$/.test(cleanCode) && verifyTotpCode(totp.secret, cleanCode)) {
      isSuccess = true;
    } else {
      const recResult = await verifyAndUseRecoveryCode(pending.uid, cleanCode);
      if (recResult.ok) {
        isSuccess = true;
        usedRecoveryCode = true;
        remainingCodesCount = recResult.remainingCount;
      }
    }

    if (!isSuccess) {
      const fail = await recordTotpFailure(pending.uid);
      void recordLoginEvent(pending.uid, false, req);
      if (fail.locked) {
        return res.status(429).json({ error: 'Bạn đã nhập sai 5 lần liên tiếp. Xác thực tạm thời bị khóa 15 phút.' });
      }
      return res.status(401).json({ error: 'Mã xác thực hoặc mã khôi phục không đúng' });
    }

    await resetTotpFailures(pending.uid);

    const user = await getUserById(pending.uid);
    if (!user) return res.status(401).json({ error: 'Tài khoản không tồn tại' });

    const statusCheck = await handleUserAccountStatus(user);
    if (statusCheck.blocked) {
      return res.status(statusCheck.errorResponse!.status).json(statusCheck.errorResponse!.body);
    }

    if (usedRecoveryCode) {
      void createNotification(
        nanoid(),
        user.id,
        'Một mã khôi phục 2FA vừa được sử dụng để đăng nhập vào tài khoản của bạn.',
        '/profile?tab=security'
      );
      if (user.email && user.email_verified === 1 && env.mail.host) {
        const timeStr = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
        sendRecoveryCodeUsedEmail(user.email, {
          time: timeStr,
          remainingCodes: remainingCodesCount,
        }).catch(() => {});
      }
    }

    const sid = await createSession(user.id, req);
    recordDeviceLink(user.id, req.headers['x-device-id'] as string, req.ip || '').catch(() => {});
    void recordLoginEvent(user.id, true, req);
    res.cookie('vnd_session', signSession(user, sid), cookieOpts);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

authRouter.get('/2fa/status', requireAuth, async (req, res, next) => {
  try {
    const totp = await getTotp(req.user!.id);
    res.json({ enabled: totp?.enabled === 1 });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/2fa/setup', requireAuth, async (req, res, next) => {
  try {
    const existing = await getTotp(req.user!.id);
    if (existing?.enabled === 1) return res.status(400).json({ error: 'Xác thực 2 lớp đã được bật' });

    const secret = generateBase32Secret();
    await saveTotpSecret(req.user!.id, secret);
    const label = req.user!.email || req.user!.username;
    res.json({ secret, otpauthUri: buildOtpAuthUri(secret, label, env.appName) });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/2fa/enable', requireAuth, async (req, res, next) => {
  try {
    const totp = await getTotp(req.user!.id);
    if (!totp) return res.status(400).json({ error: 'Chưa khởi tạo xác thực 2 lớp' });
    if (!verifyTotpCode(totp.secret, String(req.body.code || ''))) {
      return res.status(401).json({ error: 'Mã xác thực không đúng' });
    }
    await enableTotp(req.user!.id);
    const recoveryCodes = await generateAndSaveRecoveryCodes(req.user!.id);
    void auditService.record(req.user!.id, 'ENABLE_2FA', req.user!.id);
    res.json({ ok: true, recoveryCodes });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/2fa/disable', requireAuth, async (req, res, next) => {
  try {
    const totp = await getTotp(req.user!.id);
    if (!totp || totp.enabled !== 1) return res.status(400).json({ error: 'Xác thực 2 lớp chưa được bật' });
    if (!verifyTotpCode(totp.secret, String(req.body.code || ''))) {
      return res.status(401).json({ error: 'Mã xác thực không đúng' });
    }
    await deleteTotp(req.user!.id);
    await pool.query('DELETE FROM totp_recovery_codes WHERE user_id = $1', [req.user!.id]);
    void auditService.record(req.user!.id, 'DISABLE_2FA', req.user!.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

authRouter.get('/2fa/recovery-codes/count', requireAuth, async (req, res, next) => {
  try {
    const count = await countRemainingRecoveryCodes(req.user!.id);
    res.json({ remainingCount: count, totalCount: 8 });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/2fa/recovery-codes/regenerate', requireAuth, async (req, res, next) => {
  try {
    const code = String(req.body.code || '').trim();
    const totp = await getTotp(req.user!.id);
    if (!totp || totp.enabled !== 1) {
      return res.status(400).json({ error: 'Xác thực 2 bước chưa được kích hoạt' });
    }
    if (!verifyTotpCode(totp.secret, code)) {
      return res.status(401).json({ error: 'Mã xác thực 2 bước không chính xác' });
    }
    const recoveryCodes = await generateAndSaveRecoveryCodes(req.user!.id);
    void auditService.record(req.user!.id, 'REGENERATE_2FA_RECOVERY_CODES', req.user!.id);
    res.json({ ok: true, recoveryCodes });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/email-code/request', smartRateLimit({ name: 'email_code', windowSeconds: 60, maxRequests: 5 }), async (req, res, next) => {
  try {
    const { email, captchaToken } = req.body;
    const cleanEmail = String(email || '').trim().toLowerCase();

    const captchaOk = await verifyTurnstile(captchaToken, req.ip);
    if (!captchaOk) {
      return res.status(400).json({ error: 'Xác thực Captcha thất bại, vui lòng thử lại' });
    }

    const emailHash = crypto.createHash('sha256').update(cleanEmail).digest('hex');
    const rawIp = getClientIp(req);
    const ipH = hashIp(rawIp);

    const emailThrottleRes = await pool.query<{ c: string }>(
      `SELECT COUNT(*) as c FROM email_code_throttle
       WHERE identifier_hash = $1 AND created_at >= now() - interval '1 hour'`,
      [emailHash]
    );

    const ipThrottleRes = await pool.query<{ c: string }>(
      `SELECT COUNT(*) as c FROM email_code_throttle
       WHERE identifier_hash = $1 AND created_at >= now() - interval '1 hour'`,
      [ipH]
    );

    const emailAttempts = Number(emailThrottleRes.rows[0]?.c || 0);
    const ipAttempts = Number(ipThrottleRes.rows[0]?.c || 0);

    if (emailAttempts < 3 && ipAttempts < 3) {
      await pool.query(
        'INSERT INTO email_code_throttle (id, identifier_hash, created_at) VALUES ($1, $2, now()), ($3, $4, now())',
        [nanoid(), emailHash, nanoid(), ipH]
      );

      const user = await getUserByEmail(cleanEmail);
      if (user && user.email_verified === 1 && !user.deleted_at && !user.banned_at) {
        const code = String(crypto.randomInt(100000, 1000000));
        const codeHash = crypto.createHash('sha256').update(`${code}:${env.jwtSecret}`).digest('hex');

        await pool.query(
          "DELETE FROM email_auth_codes WHERE user_id = $1 AND purpose = 'passwordless_login'",
          [user.id]
        );

        await pool.query(
          `INSERT INTO email_auth_codes (id, user_id, email, code_hash, purpose, attempts, max_attempts, expires_at)
           VALUES ($1, $2, $3, $4, 'passwordless_login', 0, 5, now() + interval '10 minutes')`,
          [nanoid(), user.id, cleanEmail, codeHash]
        );

        sendEmailLoginCode(cleanEmail, { code }).catch(() => {});
      }
    }

    res.json({
      ok: true,
      message: 'Nếu địa chỉ email hợp lệ và đã xác minh, mã đăng nhập đã được gửi tới hòm thư của bạn.',
    });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/email-code/verify', smartRateLimit({ name: 'email_code', windowSeconds: 60, maxRequests: 5 }), async (req, res, next) => {
  try {
    const cleanEmail = String(req.body.email || '').trim().toLowerCase();
    const code = String(req.body.code || '').trim();

    if (!cleanEmail || !code) {
      return res.status(400).json({ error: 'Vui lòng cung cấp đầy đủ email và mã xác thực' });
    }

    const user = await getUserByEmail(cleanEmail);
    if (!user) {
      return res.status(401).json({ error: 'Mã xác thực không đúng hoặc đã hết hạn' });
    }

    const { rows } = await pool.query<{
      id: string;
      code_hash: string;
      attempts: number;
      max_attempts: number;
    }>(
      `SELECT id, code_hash, attempts, max_attempts
       FROM email_auth_codes
       WHERE user_id = $1 AND purpose = 'passwordless_login' AND expires_at > now()`,
      [user.id]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Mã xác thực không đúng hoặc đã hết hạn' });
    }

    const record = rows[0];
    if (record.attempts >= record.max_attempts) {
      return res.status(429).json({ error: 'Bạn đã nhập sai mã xác minh quá 5 lần. Vui lòng yêu cầu mã mới.' });
    }

    const inputHash = crypto.createHash('sha256').update(`${code}:${env.jwtSecret}`).digest('hex');
    if (inputHash !== record.code_hash) {
      await pool.query('UPDATE email_auth_codes SET attempts = attempts + 1 WHERE id = $1', [record.id]);
      return res.status(401).json({ error: 'Mã xác thực không chính xác' });
    }

    await pool.query('DELETE FROM email_auth_codes WHERE id = $1', [record.id]);

    const statusCheck = await handleUserAccountStatus(user);
    if (statusCheck.blocked) {
      return res.status(statusCheck.errorResponse!.status).json(statusCheck.errorResponse!.body);
    }

    const totp = await getTotp(user.id);
    if (totp?.enabled === 1) {
      return res.json({ requires2fa: true, pendingToken: signPendingTwoFactor(user.id) });
    }

    const sid = await createSession(user.id, req);
    recordDeviceLink(user.id, req.headers['x-device-id'] as string, req.ip || '').catch(() => {});
    void recordLoginEvent(user.id, true, req);
    res.cookie('vnd_session', signSession(user, sid), cookieOpts);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/forgot-password', smartRateLimit({ name: 'forgot_password', windowSeconds: 60, maxRequests: 5 }), validateBody(forgotPasswordSchema), async (req, res, next) => {
  try {
    const { email, captchaToken } = req.body;

    const captchaOk = await verifyTurnstile(captchaToken, req.ip);
    if (!captchaOk) return res.status(400).json({ error: 'Xác thực Captcha thất bại, vui lòng thử lại' });

    const user = await getUserByEmail(email);
    if (user) {
      await invalidatePendingResetsForUser(user.id);
      const rawToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      await createPasswordReset(nanoid(), user.id, hashToken(rawToken), expiresAt);
      const resetUrl = `${env.clientUrl}/reset-password?token=${rawToken}`;
      sendPasswordResetEmail(email, resetUrl).catch(() => {});
    }

    res.json({ ok: true, message: 'Nếu email tồn tại, hướng dẫn đặt lại mật khẩu đã được gửi' });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/reset-password', validateBody(resetPasswordSchema), async (req, res, next) => {
  try {
    const { token, password } = req.body;
    const record = await findValidPasswordReset(hashToken(token));
    if (!record) return res.status(400).json({ error: 'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn' });

    const targetUser = await getUserById(record.user_id);
    await validatePasswordPolicy(password, { username: targetUser?.username, email: targetUser?.email ?? undefined });

    const passwordHash = await hashPassword(password);
    await setUserPasswordHash(record.user_id, passwordHash);
    await markPasswordResetUsed(record.id);

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

authRouter.get('/verify-email/:token', async (req, res, next) => {
  try {
    const record = await findValidEmailVerification(hashToken(req.params.token));
    if (!record) return res.redirect(`${env.clientUrl}/login?verified=0`);

    await markEmailVerified(record.user_id);
    await markEmailVerificationUsed(record.id);
    res.redirect(`${env.clientUrl}/login?verified=1`);
  } catch (err) {
    next(err);
  }
});

authRouter.post('/logout', async (req, res) => {
  const cookieToken = req.cookies?.vnd_session;
  const payload = cookieToken && verifySession(cookieToken);
  if (payload?.sid) {
    await revokeSession(payload.sid);
  }
  res.clearCookie('vnd_session', {
    httpOnly: true,
    secure: env.nodeEnv === 'production',
    sameSite: 'lax',
    path: '/',
  });
  res.json({ ok: true });
});

authRouter.post('/change-password', requireAuth, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Vui lòng nhập đầy đủ mật khẩu hiện tại và mật khẩu mới' });
    }
    await validatePasswordPolicy(newPassword, { username: req.user!.username, email: req.user!.email ?? undefined });
    if (!req.user!.password_hash) {
      return res.status(400).json({ error: 'Tài khoản đăng nhập qua mạng xã hội không có mật khẩu' });
    }
    const match = await comparePassword(currentPassword, req.user!.password_hash);
    if (!match) {
      return res.status(400).json({ error: 'Mật khẩu hiện tại không chính xác' });
    }
    const newHash = await hashPassword(newPassword);
    await setUserPasswordHash(req.user!.id, newHash);
    void auditService.record(req.user!.id, 'CHANGE_PASSWORD', req.user!.id);
    res.json({ ok: true, message: 'Đổi mật khẩu thành công' });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/avatar', requireAuth, async (req, res, next) => {
  try {
    const { avatar_url } = req.body;
    let finalUrl: string | null = null;
    if (typeof avatar_url === 'string' && avatar_url.trim()) {
      const trimmed = avatar_url.trim();
      if (trimmed.length > 2_500_000) {
        return res.status(400).json({ error: 'Dung lượng ảnh đại diện quá lớn (tối đa 2MB)' });
      }
      finalUrl = trimmed;
    }
    await updateUserAvatar(req.user!.id, finalUrl);
    res.json({ ok: true, avatar_url: finalUrl });
  } catch (err) {
    next(err);
  }
});

authRouter.get('/me', requireAuth, (req, res) => {
  const {
    id,
    username,
    avatar_url,
    role,
    balance_nova,
    streak_days,
    email,
    email_verified,
    card_id,
    card_bg,
    card_show_wm,
    xp,
    avatar_frame,
  } = req.user!;
  const currentXp = Number(xp || 0);
  const levelProgress = calculateLevel(currentXp);
  res.json({
    id,
    username,
    avatar_url,
    role,
    balance_nova,
    streak_days,
    email,
    email_verified: Boolean(email_verified),
    card_id: card_id || null,
    card_bg: card_bg || null,
    card_show_wm: card_show_wm !== 0,
    xp: currentXp,
    level: levelProgress.level,
    levelProgress,
    avatar_frame: avatar_frame || null,
  });
});

authRouter.patch('/card-config', requireAuth, async (req, res, next) => {
  try {
    const { card_bg, card_show_wm } = req.body;
    await updateCardConfig(req.user!.id, card_bg ?? null, card_show_wm ?? true);
    res.json({ ok: true, card_bg, card_show_wm });
  } catch (err) {
    next(err);
  }
});
