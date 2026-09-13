import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { verifyTurnstile } from '../services/turnstileService.js';
import { listTasksForUser, startTaskForUser, completeAttempt } from '../services/taskService.js';
import { getAttemptByToken } from '../repositories/taskRepository.js';

export const tasksRouter = Router();

tasksRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    res.json(await listTasksForUser(req.user!.id));
  } catch (err) {
    next(err);
  }
});

tasksRouter.post('/:id/start', requireAuth, async (req, res, next) => {
  try {
    res.json(await startTaskForUser(req.user!.id, req.params.id));
  } catch (err) {
    next(err);
  }
});

tasksRouter.get('/attempt/:token', async (req, res, next) => {
  try {
    const attempt = await getAttemptByToken(req.params.token);
    if (!attempt) return res.status(404).json({ error: 'Link không hợp lệ hoặc đã hết hạn' });
    if (attempt.status !== 'pending') return res.status(409).json({ error: 'Link này đã được sử dụng' });
    res.json({ taskName: attempt.task_name, rewardNova: attempt.reward_nova });
  } catch (err) {
    next(err);
  }
});

tasksRouter.post('/attempt/:token/verify', async (req, res, next) => {
  try {
    const captchaOk = await verifyTurnstile(req.body.captchaToken, req.ip);
    if (!captchaOk) return res.status(400).json({ error: 'Xác thực Cloudflare Turnstile thất bại, thử lại' });

    const result = await completeAttempt(req.params.token);
    if (!result) return res.status(409).json({ error: 'Link này không hợp lệ hoặc đã được dùng' });

    res.json({ ok: true, rewardNova: result.rewardNova });
  } catch (err) {
    next(err);
  }
});
