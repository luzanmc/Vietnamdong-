import { Router } from 'express';
import { env } from '../config/env.js';
import { requireAuth } from '../middleware/auth.js';
import { getUserByUsername, setReferredBy, countReferredUsers, sumReferralBonusEarned } from '../repositories/userRepository.js';

export const referralRouter = Router();

referralRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    const referred = await countReferredUsers(req.user!.id);
    const totalEarned = await sumReferralBonusEarned(req.user!.id);

    let baseUrl = env.clientUrl;
    const originHeader = req.headers.origin || (req.headers.referer ? new URL(req.headers.referer).origin : null);
    const hostHeader = (req.headers['x-forwarded-host'] || req.headers.host) as string | undefined;
    const protoHeader = (req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http')) as string;

    if (originHeader && !originHeader.includes('localhost') && !originHeader.includes('127.0.0.1')) {
      baseUrl = originHeader;
    } else if (hostHeader && !hostHeader.includes('localhost') && !hostHeader.includes('127.0.0.1')) {
      baseUrl = `${protoHeader}://${hostHeader}`;
    }

    if (baseUrl.includes('localhost')) {
      baseUrl = 'https://vietnamdong.vercel.app';
    }

    res.json({
      referral_link: `${baseUrl.replace(/\/+$/, '')}/r/${encodeURIComponent(req.user!.username)}`,
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
