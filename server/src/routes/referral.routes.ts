import { Router } from 'express';
import { env } from '../config/env.js';
import { requireAuth } from '../middleware/auth.js';
import { getUserByUsername, setReferredBy, countReferredUsers, sumReferralBonusEarned } from '../repositories/userRepository.js';

export const referralRouter = Router();

referralRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    const referred = await countReferredUsers(req.user!.id);
    const totalEarned = await sumReferralBonusEarned(req.user!.id);

    res.json({
      referral_link: `${env.clientUrl}/r/${req.user!.username}`,
      referred_count: referred.length,
      referred_users: referred,
      total_earned_nova: totalEarned,
    });
  } catch (err) {
    next(err);
  }
});

referralRouter.post('/claim', requireAuth, async (req, res, next) => {
  try {
    if (req.user!.referred_by) return res.status(400).json({ error: 'Tài khoản đã có người giới thiệu' });

    const referrer = await getUserByUsername(req.body.ref_username);
    if (!referrer || referrer.id === req.user!.id) return res.status(400).json({ error: 'Mã giới thiệu không hợp lệ' });

    await setReferredBy(req.user!.id, referrer.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
