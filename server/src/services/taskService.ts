import { nanoid } from 'nanoid';
import { env } from '../config/env.js';
import { withTransaction } from '../db/database.js';
import { createLink } from './shortlinkService.js';
import { credit } from './coinService.js';
import { payReferralBonus } from './referralService.js';
import { payCreatorBonus } from './creatorService.js';
import { logToDiscord } from './discordService.js';
import { checkAndUnlockAchievements } from './achievementService.js';
import { flagAndCheckAnomaly } from './securityService.js';
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

export async function startTaskForUser(userId: string, taskId: string): Promise<{ shortUrl: string }> {
  const task = await getTaskById(taskId);
  if (!task) throw new HttpError(404, 'Nhiệm vụ không tồn tại');

  const doneToday = await countCompletedAttemptsToday(task.id, userId);
  if (doneToday >= task.daily_limit) {
    throw new HttpError(400, 'Đã đạt giới hạn lượt hôm nay');
  }

  const attemptId = nanoid();
  const token = nanoid(24);
  const destinationUrl = `${env.clientUrl}/vuotlinkthanhcong/${token}/`;
  const { shortUrl } = await createLink({ providerKey: task.provider_key, destinationUrl });

  await createAttempt(attemptId, task.id, userId, token, shortUrl);
  return { shortUrl };
}

export async function completeAttempt(token: string): Promise<CompleteAttemptResult | null> {
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
