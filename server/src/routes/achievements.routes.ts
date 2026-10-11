import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getAchievementsForUser } from '../services/achievementService.js';

export const achievementsRouter = Router();

achievementsRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    res.json(await getAchievementsForUser(req.user!.id));
  } catch (err) {
    next(err);
  }
});
