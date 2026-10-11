import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { listNotificationsForUser, countUnreadNotifications, markAllNotificationsRead } from '../repositories/notificationRepository.js';

export const notificationsRouter = Router();

notificationsRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    const [items, unreadCount] = await Promise.all([
      listNotificationsForUser(req.user!.id),
      countUnreadNotifications(req.user!.id),
    ]);
    res.json({ items, unreadCount });
  } catch (err) {
    next(err);
  }
});

notificationsRouter.post('/read', requireAuth, async (req, res, next) => {
  try {
    await markAllNotificationsRead(req.user!.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
