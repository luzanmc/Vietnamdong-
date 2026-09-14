import crypto from 'node:crypto';
import { Router } from 'express';
import { nanoid } from 'nanoid';
import { OAuth2Client } from 'google-auth-library';
import { env } from '../config/env.js';
import { signSession } from '../utils/jwt.js';
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
  setUserPasswordHash,
  markEmailVerified,
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

    const id = nanoid();
    const passwordHash = await hashPassword(password);
    await createUserWithPassword(id, email, username, passwordHash);
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

    const user = await getUserByEmail(email);
    if (!user || !user.password_hash) return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng' });

    const valid = await comparePassword(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng' });

    res.cookie('vnd_session', signSession(user), cookieOpts);
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
  res.clearCookie('vnd_session');
  res.json({ ok: true });
});

authRouter.get('/me', requireAuth, (req, res) => {
  const { id, username, avatar_url, role, balance_nova, streak_days, email, email_verified } = req.user!;
  res.json({ id, username, avatar_url, role, balance_nova, streak_days, email, email_verified: Boolean(email_verified) });
});
