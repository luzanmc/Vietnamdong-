import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireNotLocked } from '../middleware/requireNotLocked.js';
import { getSpinStatus, spinForUser } from '../services/spinService.js';

export const spinRouter = Router();

spinRouter.get('/status', requireAuth, async (req, res, next) => {
  try {
    res.json(await getSpinStatus(req.user!.id));
  } catch (err) {
    next(err);
  }
});

spinRouter.post('/spin', requireAuth, requireNotLocked, async (req, res, next) => {
  try {
    res.json({ ok: true, ...(await spinForUser(req.user!.id)) });
  } catch (err) {
    next(err);
  }
});
