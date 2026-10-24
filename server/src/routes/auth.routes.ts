import crypto from 'node:crypto';
import { Router } from 'express';
import { nanoid } from 'nanoid';
import { OAuth2Client } from 'google-auth-library';
import { env } from '../config/env.js';
import { signSession, signPendingTwoFactor, verifyPendingTwoFactor } from '../utils/jwt.js';
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
import { verifyTurnstile } from '../services/turnstileService.js';
import { hashPassword, comparePassword } from '../services/passwordService.js';
import { sendPasswordResetEmail, sendVerificationEmail } from '../services/mailService.js';
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
import type { CookieOptions } from 'express';

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

    res.cookie('vnd_session', signSession(user), cookieOpts);
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

    res.cookie('vnd_session', signSession(user), cookieOpts);
    res.json({ ok: true });
  } catch (err) {
    (err as any).status = 401;
    (err as any).publicMessage = 'Đăng nhập Google thất bại';
    next(err);
  }
});

authRouter.post('/register', validateBody(registerSchema), async (req, res, next) => {
  try {
    const { username, email, password, captchaToken } = req.body;

    const captchaOk = await verifyTurnstile(captchaToken, req.ip);
    if (!captchaOk) return res.status(400).json({ error: 'Xác thực Captcha thất bại, vui lòng thử lại' });

    if (await getUserByEmail(email)) return res.status(409).json({ error: 'Email này đã được đăng ký' });
    if (await getUserByUsername(username)) return res.status(409).json({ error: 'Tên đăng nhập đã tồn tại' });

    const clientIp = req.ip || null;
    if (clientIp) {
      const recentCount = await countUsersFromIpToday(clientIp);
      if (recentCount >= env.security.maxRegistrationsPerIpPerDay) {
        return res.status(429).json({ error: 'Đã đạt giới hạn số tài khoản đăng ký từ địa chỉ này trong 24 giờ' });
      }
    }

    const id = nanoid();
    const passwordHash = await hashPassword(password);
    await createUserWithPassword(id, email, username, passwordHash, clientIp);
    const user = (await getUserById(id))!;

    const rawToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await createEmailVerification(nanoid(), user.id, hashToken(rawToken), expiresAt);
    const verifyUrl = `${env.clientUrl}/api/auth/verify-email/${rawToken}`;
    sendVerificationEmail(email, verifyUrl).catch(() => {});

    res.cookie('vnd_session', signSession(user), cookieOpts);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/login', validateBody(loginSchema), async (req, res, next) => {
  try {
    const { email, password, captchaToken } = req.body;

    const captchaOk = await verifyTurnstile(captchaToken, req.ip);
    if (!captchaOk) return res.status(400).json({ error: 'Xác thực Captcha thất bại, vui lòng thử lại' });

    const identifier = String(email || '').trim();
    const user = identifier.includes('@')
      ? await getUserByEmail(identifier)
      : (await getUserByUsername(identifier)) || (await getUserByEmail(identifier));

    if (!user || !user.password_hash) return res.status(401).json({ error: 'Tài khoản hoặc mật khẩu không đúng' });

    const valid = await comparePassword(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Tài khoản hoặc mật khẩu không đúng' });

    if (user.deleted_at) {
      return res.status(401).json({ error: 'Tài khoản không tồn tại' });
    }

    if (user.banned_at) {
      const isExpired = user.ban_expires_at && new Date(user.ban_expires_at) <= new Date();
      if (!isExpired) {
        const expiryStr = user.ban_expires_at ? new Date(user.ban_expires_at).toLocaleString('vi-VN') : 'Vĩnh viễn';
        const reasonStr = user.ban_reason ? ` Lý do: ${user.ban_reason}.` : '';
        return res.status(403).json({
          error: `Tài khoản của bạn đã bị khóa.${reasonStr} Thời hạn: ${expiryStr}.`,
          banned: true,
          reason: user.ban_reason,
          expiresAt: user.ban_expires_at,
        });
      }
    }

    const totp = await getTotp(user.id);
    if (totp?.enabled === 1) {
      return res.json({ requires2fa: true, pendingToken: signPendingTwoFactor(user.id) });
    }

    res.cookie('vnd_session', signSession(user), cookieOpts);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/login/2fa', async (req, res, next) => {
  try {
    const pendingToken = String(req.body.pendingToken || '');
    const code = String(req.body.code || '');

    const pending = verifyPendingTwoFactor(pendingToken);
    if (!pending) return res.status(401).json({ error: 'Phiên xác thực đã hết hạn, vui lòng đăng nhập lại' });

    const totp = await getTotp(pending.uid);
    if (!totp || totp.enabled !== 1) return res.status(400).json({ error: 'Tài khoản chưa bật xác thực 2 lớp' });

    if (!verifyTotpCode(totp.secret, code)) return res.status(401).json({ error: 'Mã xác thực không đúng' });

    const user = await getUserById(pending.uid);
    if (!user) return res.status(401).json({ error: 'Tài khoản không tồn tại' });

    if (user.deleted_at) {
      return res.status(401).json({ error: 'Tài khoản không tồn tại' });
    }

    if (user.banned_at) {
      const isExpired = user.ban_expires_at && new Date(user.ban_expires_at) <= new Date();
      if (!isExpired) {
        const expiryStr = user.ban_expires_at ? new Date(user.ban_expires_at).toLocaleString('vi-VN') : 'Vĩnh viễn';
        const reasonStr = user.ban_reason ? ` Lý do: ${user.ban_reason}.` : '';
        return res.status(403).json({
          error: `Tài khoản của bạn đã bị khóa.${reasonStr} Thời hạn: ${expiryStr}.`,
          banned: true,
          reason: user.ban_reason,
          expiresAt: user.ban_expires_at,
        });
      }
    }

    res.cookie('vnd_session', signSession(user), cookieOpts);
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
    res.json({ ok: true });
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
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/forgot-password', validateBody(forgotPasswordSchema), async (req, res, next) => {
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

authRouter.post('/logout', (req, res) => {
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
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
    }
    if (!req.user!.password_hash) {
      return res.status(400).json({ error: 'Tài khoản đăng nhập qua mạng xã hội không có mật khẩu' });
    }
    const match = await comparePassword(currentPassword, req.user!.password_hash);
    if (!match) {
      return res.status(400).json({ error: 'Mật khẩu hiện tại không chính xác' });
    }
    const newHash = await hashPassword(newPassword);
    await setUserPasswordHash(req.user!.id, newHash);
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
  const { id, username, avatar_url, role, balance_nova, streak_days, email, email_verified, card_id, card_bg, card_show_wm, xp, avatar_frame } = req.user!;
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
