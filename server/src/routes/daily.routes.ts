import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getStatusForUser, claimForUser } from '../services/dailyRewardService.js';

export const dailyRouter = Router();

dailyRouter.get('/status', requireAuth, async (req, res, next) => {
  try {
    res.json(await getStatusForUser(req.user!.id));
  } catch (err) {
    next(err);
  }
});

dailyRouter.post('/claim', requireAuth, async (req, res, next) => {
  try {
    res.json({ ok: true, ...(await claimForUser(req.user!.id)) });
  } catch (err) {
    next(err);
  }
});
