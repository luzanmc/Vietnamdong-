import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireEmailVerified } from '../middleware/requireEmailVerified.js';
import { requireNotLocked } from '../middleware/requireNotLocked.js';
import { validateBody } from '../middleware/validate.js';
import { redeemOrderSchema } from '../validators/redeem.validators.js';
import { getGroupedCatalog, createOrderForUser } from '../services/redeemService.js';
import { listRedeemOrdersForUser } from '../repositories/redeemRepository.js';

export const redeemRouter = Router();

redeemRouter.get('/catalog', requireAuth, async (req, res, next) => {
  try {
    res.json(await getGroupedCatalog());
  } catch (err) {
    next(err);
  }
});

redeemRouter.post('/order', requireAuth, requireNotLocked, requireEmailVerified, validateBody(redeemOrderSchema), async (req, res, next) => {
  try {
    const { id } = await createOrderForUser(req.user!.id, req.body.item_id, req.body.destination);
    res.json({ ok: true, id, status: 'pending' });
  } catch (err) {
    next(err);
  }
});

redeemRouter.get('/orders', requireAuth, async (req, res, next) => {
  try {
    res.json(await listRedeemOrdersForUser(req.user!.id));
  } catch (err) {
    next(err);
  }
});
