import { Router } from 'express';
import { nanoid } from 'nanoid';
import rateLimit from 'express-rate-limit';
import { pool } from '../db/database.js';
import { env } from '../config/env.js';
import { requireAuth } from '../middleware/auth.js';
import { requireNotLocked } from '../middleware/requireNotLocked.js';
import { requireNoVpn } from '../middleware/requireNoVpn.js';
import { verifyTurnstile } from '../services/turnstileService.js';
import { listTasksForUser, startTaskForUser, completeAttempt } from '../services/taskService.js';
import { getAttemptByToken, getAnyTaskById } from '../repositories/taskRepository.js';
import { getSetting } from '../repositories/settingsRepository.js';
import { sendAlert } from '../services/discordService.js';

export const tasksRouter = Router();

tasksRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    res.json(await listTasksForUser(req.user!.id));
  } catch (err) {
    next(err);
  }
});

tasksRouter.post('/:id/start', requireAuth, requireNotLocked, requireNoVpn, async (req, res, next) => {
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

    res.json({
      ok: true,
      rewardNova: result.rewardNova,
      bonusNova: result.bonusNova,
      xpGained: result.xpGained,
      level: result.level,
      levelUp: result.levelUp,
    });
  } catch (err) {
    next(err);
  }
});

const reportRateLimiter = rateLimit({ windowMs: 60_000, max: 10 });

tasksRouter.post('/:id/report', requireAuth, reportRateLimiter, async (req, res, next) => {
  try {
    const taskId = req.params.id;
    const userId = req.user!.id;
    const reason = String(req.body.reason || '').trim().slice(0, 200);

    const { rows: existing } = await pool.query(
      `SELECT id FROM task_reports WHERE task_id = $1 AND user_id = $2 AND created_at >= now() - interval '24 hours'`,
      [taskId, userId]
    );
    if (existing.length > 0) {
      return res.status(429).json({ error: 'Bạn đã báo cáo link này trong 24 giờ qua' });
    }

    const reportId = nanoid();
    await pool.query(
      `INSERT INTO task_reports (id, task_id, user_id, reason, created_at) VALUES ($1, $2, $3, $4, now())`,
      [reportId, taskId, userId, reason || 'Link hỏng']
    );

    const { rows: countRows } = await pool.query<{ user_count: string }>(
      `SELECT COUNT(DISTINCT user_id) AS user_count FROM task_reports WHERE task_id = $1 AND created_at >= now() - interval '1 hour'`,
      [taskId]
    );
    const distinctUsers = Number(countRows[0]?.user_count || 0);
    const thresholdSetting = await getSetting('alert_broken_task_threshold');
    const threshold = Number(thresholdSetting || 5);
    const enabledSetting = await getSetting('alert_broken_task_enabled');
    const alertEnabled = enabledSetting !== 'false' && enabledSetting !== '0';

    if (distinctUsers >= threshold && alertEnabled) {
      const task = await getAnyTaskById(taskId);
      const taskName = task?.name || taskId;
      const autoHideSetting = await getSetting('auto_hide_broken_tasks');
      const autoHide = autoHideSetting === 'true' || autoHideSetting === '1';

      if (autoHide) {
        await pool.query('UPDATE tasks SET active = 0 WHERE id = $1', [taskId]);
      }

      const actionText = autoHide ? 'Đã tự động tạm ẩn link' : 'Chưa tự ẩn (đề xuất tạm ẩn link trong admin)';
      sendAlert(
        'task_broken',
        'Cảnh báo link bị báo lỗi hàng loạt',
        [
          { name: 'Nhiệm vụ', value: `${taskName} (${taskId})`, inline: true },
          { name: 'Số người báo lỗi (1h)', value: String(distinctUsers), inline: true },
          { name: 'Trạng thái xử lý', value: actionText, inline: false },
          { name: 'Quản trị nhiệm vụ', value: `${env.clientUrl}/admin`, inline: false },
        ],
        taskId,
        'danger'
      ).catch(() => {});
    }

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
