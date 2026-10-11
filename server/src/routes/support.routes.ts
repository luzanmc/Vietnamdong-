import { Router } from 'express';
import { nanoid } from 'nanoid';
import { requireAuth } from '../middleware/auth.js';
import { logToDiscord } from '../services/discordService.js';
import {
  createTicket,
  addMessage,
  listTicketsForUser,
  getTicketForUser,
  getMessagesForTicket,
} from '../repositories/supportRepository.js';

export const supportRouter = Router();

supportRouter.get('/tickets', requireAuth, async (req, res, next) => {
  try {
    res.json(await listTicketsForUser(req.user!.id));
  } catch (err) {
    next(err);
  }
});

supportRouter.post('/tickets', requireAuth, async (req, res, next) => {
  try {
    const subject = String(req.body.subject || '').trim();
    const message = String(req.body.message || '').trim();
    if (!subject || !message) return res.status(400).json({ error: 'Vui lòng nhập tiêu đề và nội dung' });

    const id = nanoid();
    await createTicket(id, req.user!.id, subject);
    await addMessage(nanoid(), id, 'user', message);
    logToDiscord(`🎫 **${req.user!.username}** mở ticket hỗ trợ mới: "${subject}"`);
    res.json({ ok: true, id });
  } catch (err) {
    next(err);
  }
});

supportRouter.get('/tickets/:id', requireAuth, async (req, res, next) => {
  try {
    const ticket = await getTicketForUser(req.params.id, req.user!.id);
    if (!ticket) return res.status(404).json({ error: 'Không tìm thấy ticket' });
    const messages = await getMessagesForTicket(ticket.id);
    res.json({ ticket, messages });
  } catch (err) {
    next(err);
  }
});

supportRouter.post('/tickets/:id/messages', requireAuth, async (req, res, next) => {
  try {
    const ticket = await getTicketForUser(req.params.id, req.user!.id);
    if (!ticket) return res.status(404).json({ error: 'Không tìm thấy ticket' });
    const message = String(req.body.message || '').trim();
    if (!message) return res.status(400).json({ error: 'Nội dung không được để trống' });

    await addMessage(nanoid(), ticket.id, 'user', message);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
