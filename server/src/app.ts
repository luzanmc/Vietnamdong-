import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { ensureReady } from './db/database.js';

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
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
app.set('trust proxy', 1);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: new URL(env.clientUrl).origin, credentials: true }));
app.use(express.json());
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

app.use(errorHandler);

export { app };
