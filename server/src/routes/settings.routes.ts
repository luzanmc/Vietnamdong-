import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getSetting } from '../repositories/settingsRepository.js';
import { getActiveAnnouncement } from '../repositories/announcementRepository.js';
import { env } from '../config/env.js';

export const settingsRouter = Router();

settingsRouter.get('/public', requireAuth, async (req, res, next) => {
  try {
    const announcement = await getActiveAnnouncement();
    res.json({
      music_url: (await getSetting('music_url')) ?? '',
      nova_to_vnd_rate: env.economy.novaToVnd,
      announcement: announcement?.message ?? '',
    });
  } catch (err) {
    next(err);
  }
});
