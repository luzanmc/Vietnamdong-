import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireEmailVerified } from '../middleware/requireEmailVerified.js';
import { requireNotLocked } from '../middleware/requireNotLocked.js';
import { getVietsubPublicInfo, requestNovaPurchase, createVndOrder } from '../services/vietsubService.js';
import { listVietsubOrdersForUser } from '../repositories/vietsubRepository.js';

export const vietsubRouter = Router();

vietsubRouter.get('/info', requireAuth, async (req, res, next) => {
  try {
    res.json(await getVietsubPublicInfo());
  } catch (err) {
    next(err);
  }
});

vietsubRouter.post('/buy-nova', requireAuth, requireNotLocked, requireEmailVerified, async (req, res, next) => {
  try {
    res.json({ ok: true, ...(await requestNovaPurchase(req.user!.id)) });
  } catch (err) {
    next(err);
  }
});

vietsubRouter.post('/buy-vnd', requireAuth, requireNotLocked, requireEmailVerified, async (req, res, next) => {
  try {
    const transferNote = String(req.body.transferNote || '').trim();
    if (!transferNote) return res.status(400).json({ error: 'Vui lòng nhập nội dung chuyển khoản' });
    res.json({ ok: true, ...(await createVndOrder(req.user!.id, transferNote)) });
  } catch (err) {
    next(err);
  }
});

vietsubRouter.get('/orders', requireAuth, async (req, res, next) => {
  try {
    res.json(await listVietsubOrdersForUser(req.user!.id));
  } catch (err) {
    next(err);
  }
});
