import { nanoid } from 'nanoid';
import { env } from '../config/env.js';
import { withTransaction, pool } from '../db/database.js';
import { createLink } from './shortlinkService.js';
import { credit } from './coinService.js';
import { payReferralBonus } from './referralService.js';
import { payCreatorBonus } from './creatorService.js';
import { logToDiscord, sendAlert } from './discordService.js';
import { checkAndUnlockAchievements } from './achievementService.js';
import { flagAndCheckAnomaly } from './securityService.js';
import { recordDeviceLink } from './deviceLinkService.js';
import {
  listActiveTasks,
  getTaskById,
  getAnyTaskById,
  countCompletedAttemptsToday,
  createAttempt,
} from '../repositories/taskRepository.js';
import { getUserById } from '../repositories/userRepository.js';
import { createNotification } from '../repositories/notificationRepository.js';
import { calculateLevel, rollLevelBonus, TASK_COMPLETION_XP } from './levelService.js';
import { getActiveMultiplierEvent } from '../repositories/eventRepository.js';
import { HttpError } from '../utils/httpError.js';
import type { TaskWithProgress } from '../types/index.js';

export interface CompleteAttemptResult {
  rewardNova: number;
  bonusNova: number;
  xpGained: number;
  level: number;
  levelUp?: number;
}

export async function listTasksForUser(userId: string): Promise<TaskWithProgress[]> {
  const tasks = await listActiveTasks();
  return Promise.all(tasks.map(async (t) => ({ ...t, done_today: await countCompletedAttemptsToday(t.id, userId) })));
}

export async function startTaskForUser(
  userId: string,
  taskId: string,
  deviceFp?: string,
  ip?: string
): Promise<{ shortUrl: string }> {
  const task = await getTaskById(taskId);
  if (!task) throw new HttpError(404, 'Nhiệm vụ không tồn tại');

  const { rows: lastAttemptRows } = await pool.query<{ created_at: string }>(
    `SELECT created_at FROM task_attempts WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [userId]
  );
  if (lastAttemptRows.length > 0) {
    const elapsedSinceLastStart = (Date.now() - new Date(lastAttemptRows[0].created_at).getTime()) / 1000;
    if (elapsedSinceLastStart < 5) {
      throw new HttpError(429, 'Vui lòng chờ ít nhất 5 giây giữa các lượt bắt đầu nhiệm vụ');
    }
  }

  const doneToday = await countCompletedAttemptsToday(task.id, userId);
  if (doneToday >= task.daily_limit) {
    throw new HttpError(400, 'Đã đạt giới hạn lượt hôm nay');
  }

  if (deviceFp && ip) {
    recordDeviceLink(userId, deviceFp, ip).catch(() => {});
  }

  const attemptId = nanoid();
  const token = nanoid(24);
  const destinationUrl = `${env.clientUrl}/vuotlinkthanhcong/${token}/`;
  const { shortUrl } = await createLink({ providerKey: task.provider_key, destinationUrl });

  await createAttempt(attemptId, task.id, userId, token, shortUrl);
  return { shortUrl };
}

export async function completeAttempt(token: string): Promise<CompleteAttemptResult | null> {
  const { rows: attemptCheck } = await pool.query<{
    id: string;
    task_id: string;
    user_id: string;
    created_at: string;
    status: string;
    min_seconds: number | null;
    task_name: string;
  }>(
    `SELECT ta.id, ta.task_id, ta.user_id, ta.created_at, ta.status, t.min_seconds, t.name as task_name
     FROM task_attempts ta
     JOIN tasks t ON t.id = ta.task_id
     WHERE ta.token = $1`,
    [token]
  );

  if (attemptCheck.length === 0) {
    return null;
  }

  const attemptInfo = attemptCheck[0];
  if (attemptInfo.status !== 'pending') {
    return null;
  }

  const minSeconds = attemptInfo.min_seconds !== null && attemptInfo.min_seconds !== undefined ? Number(attemptInfo.min_seconds) : 8;
  const elapsedSeconds = (Date.now() - new Date(attemptInfo.created_at).getTime()) / 1000;

  if (elapsedSeconds < minSeconds) {
    await pool.query(
      `INSERT INTO security_flags (id, user_id, reason, created_at)
       VALUES ($1, $2, $3, now())`,
      [nanoid(), attemptInfo.user_id, `Hoàn thành nhiệm vụ ${attemptInfo.task_name} quá nhanh (${elapsedSeconds.toFixed(1)}s < ${minSeconds}s)`]
    );
    await pool.query(`UPDATE task_attempts SET status = 'expired' WHERE id = $1`, [attemptInfo.id]);
    const user = await getUserById(attemptInfo.user_id);
    sendAlert(
      'fast_task_completion',
      'Cảnh báo vượt link nhanh bất thường',
      [
        { name: 'Tài khoản', value: user?.username || attemptInfo.user_id, inline: true },
        { name: 'Nhiệm vụ', value: attemptInfo.task_name, inline: true },
        { name: 'Thời gian', value: `${elapsedSeconds.toFixed(1)}s (tối thiểu ${minSeconds}s)`, inline: true },
      ],
      attemptInfo.user_id,
      'warning'
    ).catch(() => {});
    throw new HttpError(400, 'Thời gian hoàn thành nhiệm vụ quá ngắn, không thể ghi nhận');
  }

  const txResult = await withTransaction(async (client) => {
    const { rows: attemptRows } = await client.query<{ id: string; task_id: string; user_id: string }>(
      `UPDATE task_attempts
       SET status = 'completed', completed_at = now()
       WHERE token = $1 AND status = 'pending'
       RETURNING id, task_id, user_id`,
      [token]
    );

    if (attemptRows.length === 0) {
      return null;
    }

    const attempt = attemptRows[0];
    const task = (await getAnyTaskById(attempt.task_id, client)) ?? {
      id: attempt.task_id,
      reward_nova: 0,
      name: 'Nhiem vu',
      provider_key: '',
      daily_limit: 1000,
      is_hot: 0,
      active: 1,
      sort_order: 0,
    };

    const { rows: userRows } = await client.query<{ id: string; username: string; xp: number }>(
      `SELECT id, username, COALESCE(xp, 0)::int AS xp FROM users WHERE id = $1 FOR UPDATE`,
      [attempt.user_id]
    );

    const activeEvent = await getActiveMultiplierEvent(client);
    let eventMultiplier = 1;
    let eventType = 'xp_vnc';
    if (activeEvent) {
      eventMultiplier = Math.min(3, Math.max(1, Number(activeEvent.multiplier) || 1));
      eventType = activeEvent.type || 'xp_vnc';
    }

    const baseReward = task.reward_nova;
    let finalReward = baseReward;
    if (eventType === 'xp_vnc' || eventType === 'vnc') {
      finalReward = Math.round(baseReward * eventMultiplier);
    }

    const baseXp = TASK_COMPLETION_XP;
    let finalXp = baseXp;
    if (eventType === 'xp_vnc' || eventType === 'xp') {
      finalXp = Math.round(baseXp * eventMultiplier);
    }

    const currentUser = userRows[0];
    const previousXp = Number(currentUser?.xp || 0);
    const oldLevel = calculateLevel(previousXp).level;
    const nextXp = previousXp + finalXp;
    const levelInfo = calculateLevel(nextXp);
    const newLevel = levelInfo.level;

    await client.query(`UPDATE users SET xp = $1 WHERE id = $2`, [nextXp, attempt.user_id]);

    let levelUp: number | undefined;
    if (newLevel > oldLevel) {
      levelUp = newLevel;
      await createNotification(
        nanoid(),
        attempt.user_id,
        `Bạn đã lên cấp ${newLevel}`,
        '/profile',
        client
      );
    }

    const bonusNova = rollLevelBonus(newLevel);
    if (bonusNova > 0) {
      await credit(attempt.user_id, bonusNova, 'level_bonus', attempt.id, client);
    }

    if (finalReward > 0) {
      await credit(attempt.user_id, finalReward, 'task_reward', attempt.id, client);
    }

    await payReferralBonus(attempt.user_id, finalReward, client);
    await payCreatorBonus(attempt.user_id, finalReward, client);

    return {
      attemptId: attempt.id,
      userId: attempt.user_id,
      taskName: task.name,
      rewardNova: finalReward,
      bonusNova,
      xpGained: finalXp,
      level: newLevel,
      levelUp,
    };
  });

  if (!txResult) {
    return null;
  }

  const user = await getUserById(txResult.userId);
  const bonusLog = txResult.bonusNova > 0 ? `, +${txResult.bonusNova} VNC bonus cap do` : '';
  logToDiscord(`[Nhiem vu] **${user?.username}** hoan thanh **${txResult.taskName}** (+${txResult.rewardNova} VNC, +${txResult.xpGained} XP${bonusLog})`);

  checkAndUnlockAchievements(txResult.userId).catch(() => {});
  flagAndCheckAnomaly(txResult.userId).catch(() => {});

  return {
    rewardNova: txResult.rewardNova,
    bonusNova: txResult.bonusNova,
    xpGained: txResult.xpGained,
    level: txResult.level,
    levelUp: txResult.levelUp,
  };
}
