import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { weeklyTop, dailyTop, recordDaily, myChart } from '../repositories/leaderboardRepository.js';

export const leaderboardRouter = Router();

leaderboardRouter.get('/weekly', requireAuth, async (req, res, next) => {
  try {
    res.json(await weeklyTop());
  } catch (err) {
    next(err);
  }
});

leaderboardRouter.get('/daily', requireAuth, async (req, res, next) => {
  try {
    res.json(await dailyTop());
  } catch (err) {
    next(err);
  }
});

leaderboardRouter.get('/record-daily', requireAuth, async (req, res, next) => {
  try {
    res.json(await recordDaily());
  } catch (err) {
    next(err);
  }
});

leaderboardRouter.get('/my-chart', requireAuth, async (req, res, next) => {
  try {
    res.json(await myChart(req.user!.id));
  } catch (err) {
    next(err);
  }
});
