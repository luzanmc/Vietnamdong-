import { Router } from 'express';
import { checkIsVpn } from '../services/vpnDetectionService.js';

export const securityRouter = Router();

securityRouter.get('/network-status', async (req, res, next) => {
  try {
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
    const result = await checkIsVpn(clientIp);
    res.json(result);
  } catch (err) {
    next(err);
  }
});
