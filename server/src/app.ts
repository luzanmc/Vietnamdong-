import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { ensureReady } from './db/database.js';
import { getMaintenanceStatus } from './services/maintenanceService.js';
import { verifySession } from './utils/jwt.js';
import { verifyAdminToken } from './middleware/adminAuth.js';

import { authRouter } from './routes/auth.routes.js';
import { tasksRouter } from './routes/tasks.routes.js';
import { walletRouter } from './routes/wallet.routes.js';
import { referralRouter } from './routes/referral.routes.js';
import { leaderboardRouter } from './routes/leaderboard.routes.js';
import { adminRouter } from './routes/admin.routes.js';
import { redeemRouter } from './routes/redeem.routes.js';
import { creatorRouter } from './routes/creator.routes.js';
import { dailyRouter } from './routes/daily.routes.js';
import { webhooksRouter } from './routes/webhooks.routes.js';
import { vietsubRouter } from './routes/vietsub.routes.js';
import { settingsRouter } from './routes/settings.routes.js';
import { notificationsRouter } from './routes/notifications.routes.js';
import { achievementsRouter } from './routes/achievements.routes.js';
import { spinRouter } from './routes/spin.routes.js';
import { questsRouter } from './routes/quests.routes.js';
import { supportRouter } from './routes/support.routes.js';
import { giftcodeRouter } from './routes/giftcode.routes.js';
import { securityRouter } from './routes/security.routes.js';
import { internalRouter } from './routes/internal.routes.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
app.set('trust proxy', 1);

app.use(helmet({ contentSecurityPolicy: false }));
const allowedOrigins = new Set([
  new URL(env.clientUrl).origin,
  'https://vietnamdong.vercel.app',
  'https://vietnamdong-zetrastudio.vercel.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.has(origin)) return callback(null, true);
      try {
        const u = new URL(origin);
        if (u.hostname === 'localhost' || u.hostname === '127.0.0.1' || u.hostname.endsWith('.vercel.app')) {
          return callback(null, true);
        }
      } catch {}
      callback(null, true);
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

app.use('/api', async (req, res, next) => {
  try {
    await ensureReady();
    next();
  } catch (err) {
    next(err);
  }
});

app.use('/api', rateLimit({ windowMs: 60_000, max: 120 }));
app.use('/api/tasks/:id/start', rateLimit({ windowMs: 60_000, max: 10 }));
app.use(
  ['/api/auth/login', '/api/auth/login/2fa', '/api/auth/2fa/enable', '/api/auth/2fa/disable', '/api/auth/register', '/api/auth/forgot-password', '/api/auth/reset-password'],
  rateLimit({ windowMs: 60_000, max: 8, standardHeaders: true, legacyHeaders: false })
);

app.use('/api', async (req, res, next) => {
  try {
    const status = await getMaintenanceStatus();
    if (!status.enabled) {
      return next();
    }

    const path = req.originalUrl.split('?')[0];
    if (
      path === '/api/auth/login' ||
      path === '/api/auth/login/2fa' ||
      path === '/api/auth/me' ||
      path === '/api/settings/public' ||
      path.startsWith('/api/security') ||
      path.startsWith('/api/internal') ||
      path.startsWith('/api/card2k')
    ) {
      return next();
    }

    let isAdmin = false;
    const sessionToken = req.cookies?.vnd_session;
    if (sessionToken) {
      const payload = verifySession(sessionToken);
      if (payload?.role === 'admin') {
        isAdmin = true;
      }
    }

    if (!isAdmin) {
      const adminToken = req.cookies?.vnd_admin_session || (req.headers['x-admin-token'] as string | undefined);
      if (adminToken && typeof adminToken === 'string') {
        const payload = verifyAdminToken(adminToken);
        if (payload?.uid) {
          isAdmin = true;
        }
      }
    }

    if (!isAdmin) {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        const payload = verifySession(authHeader.slice(7).trim());
        if (payload?.role === 'admin') {
          isAdmin = true;
        }
      }
    }

    if (isAdmin) {
      return next();
    }

    return res.status(503).json({
      maintenance: true,
      message: status.message,
      eta: status.eta,
    });
  } catch (err) {
    next(err);
  }
});

app.use('/api/auth', authRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/wallet', walletRouter);
app.use('/api/referral', referralRouter);
app.use('/api/leaderboard', leaderboardRouter);
app.use('/api/admin', adminRouter);
app.use('/api/redeem', redeemRouter);
app.use('/api/creator', creatorRouter);
app.use('/api/daily', dailyRouter);
app.use('/api/card2k', webhooksRouter);
app.use('/api/vietsub', vietsubRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/achievements', achievementsRouter);
app.use('/api/spin', spinRouter);
app.use('/api/quests', questsRouter);
app.use('/api/support', supportRouter);
app.use('/api/giftcodes', giftcodeRouter);
app.use('/api/security', securityRouter);
app.use('/api/internal', internalRouter);

app.use(errorHandler);

export { app };
