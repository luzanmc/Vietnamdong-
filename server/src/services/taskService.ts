import { nanoid } from 'nanoid';
import { env } from '../config/env.js';
import { createLink } from './shortlinkService.js';
import { credit } from './coinService.js';
import { payReferralBonus } from './referralService.js';
import { payCreatorBonus } from './creatorService.js';
import { logToDiscord } from './discordService.js';
import {
  listActiveTasks,
  getTaskById,
  getAnyTaskById,
  countCompletedAttemptsToday,
  createAttempt,
  getPendingAttemptByToken,
  markAttemptCompleted,
} from '../repositories/taskRepository.js';
import { getUserById } from '../repositories/userRepository.js';
import { HttpError } from '../utils/httpError.js';
import type { TaskWithProgress } from '../types/index.js';

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

export async function completeAttempt(token: string): Promise<{ rewardNova: number } | null> {
  const attempt = await getPendingAttemptByToken(token);
  if (!attempt) return null;

  const task = (await getAnyTaskById(attempt.task_id)) ?? { reward_nova: 0, name: 'unknown' };
  await markAttemptCompleted(attempt.id);
  await credit(attempt.user_id, task.reward_nova, 'task_reward', attempt.id);
  await payReferralBonus(attempt.user_id, task.reward_nova);
  await payCreatorBonus(attempt.user_id, task.reward_nova);

  const user = await getUserById(attempt.user_id);
  logToDiscord(`✅ **${user?.username}** hoàn thành **${task.name}** (+${task.reward_nova} Nova)`);

  return { rewardNova: task.reward_nova };
}
