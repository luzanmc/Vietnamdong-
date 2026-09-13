import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
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

redeemRouter.post('/order', requireAuth, validateBody(redeemOrderSchema), async (req, res, next) => {
  try {
    const outcome = await createOrderForUser(req.user!.id, req.body.item_id, req.body.destination);
    if (outcome.status === 'rejected') {
      return res.status(400).json({ error: outcome.reason });
    }
    res.json({ ok: true, id: outcome.id, status: outcome.status, card_pin: (outcome as any).cardPin, card_serial: (outcome as any).cardSerial });
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
