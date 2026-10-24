import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireNotLocked } from '../middleware/requireNotLocked.js';
import { smartRateLimit } from '../middleware/smartRateLimit.js';
import { redeemGiftcode } from '../services/giftcodeService.js';
import { getUserGiftcodeHistory } from '../repositories/giftcodeRepository.js';

export const giftcodeRouter = Router();

giftcodeRouter.get('/history', requireAuth, async (req, res, next) => {
  try {
    const list = await getUserGiftcodeHistory(req.user!.id);
    res.json(list);
  } catch (err) {
    next(err);
  }
});

giftcodeRouter.post(
  '/redeem',
  requireAuth,
  requireNotLocked,
  smartRateLimit({ name: 'giftcode', windowSeconds: 60, maxRequests: 10 }),
  async (req, res, next) => {
    try {
      const { code } = req.body;
      const result = await redeemGiftcode(req.user!.id, code, req.ip || '127.0.0.1');
      res.json({ ok: true, ...result });
    } catch (err) {
      next(err);
    }
  }
);
