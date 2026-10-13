import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireNotLocked } from '../middleware/requireNotLocked.js';
import { redeemGiftcode } from '../services/giftcodeService.js';

export const giftcodeRouter = Router();

giftcodeRouter.post('/redeem', requireAuth, requireNotLocked, async (req, res, next) => {
  try {
    const { code } = req.body;
    const result = await redeemGiftcode(req.user!.id, code);
    res.json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
});
