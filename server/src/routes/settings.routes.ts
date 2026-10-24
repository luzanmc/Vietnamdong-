import { Router } from 'express';
import { getSetting } from '../repositories/settingsRepository.js';
import { getActiveAnnouncement } from '../repositories/announcementRepository.js';
import { getMaintenanceStatus } from '../services/maintenanceService.js';
import { env } from '../config/env.js';

export const settingsRouter = Router();

settingsRouter.get('/public', async (req, res, next) => {
  try {
    const announcement = await getActiveAnnouncement();
    const maintenance = await getMaintenanceStatus();
    res.json({
      maintenance: maintenance.enabled,
      maintenance_message: maintenance.message,
      maintenance_eta: maintenance.eta,
      music_url: (await getSetting('music_url')) ?? '',
      nova_to_vnd_rate: env.economy.novaToVnd,
      announcement: announcement?.message ?? '',
    });
  } catch (err) {
    next(err);
  }
});
