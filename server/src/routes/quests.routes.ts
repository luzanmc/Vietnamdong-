import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getQuestsForUser, claimQuest } from '../services/questService.js';

export const questsRouter = Router();

questsRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    res.json(await getQuestsForUser(req.user!.id));
  } catch (err) {
    next(err);
  }
});

questsRouter.post('/:code/claim', requireAuth, async (req, res, next) => {
  try {
    res.json({ ok: true, ...(await claimQuest(req.user!.id, req.params.code)) });
  } catch (err) {
    next(err);
  }
});
