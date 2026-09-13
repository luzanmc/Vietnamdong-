import { env } from '../config/env.js';
import { nanoid } from 'nanoid';
import { withTransaction } from '../db/database.js';
import { credit } from './coinService.js';
import { getClaimForDate, createClaim } from '../repositories/dailyRepository.js';
import { getUserById, updateStreak } from '../repositories/userRepository.js';
import { HttpError } from '../utils/httpError.js';

export function todayStr(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function yesterdayStr(now = new Date()): string {
  const d = new Date(now);
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function rewardForStreakDay(day: number, base = env.economy.dailyRewardBase): number {
  const capped = Math.min(day, 7);
  return base * capped;
}

export function nextStreakDay(streakLastDate: string | null, currentStreakDays: number, now = new Date()): number {
  const continuing = streakLastDate === yesterdayStr(now);
  return continuing ? currentStreakDays + 1 : 1;
}

export async function getStatusForUser(
  userId: string
): Promise<{ can_claim: boolean; streak_days: number; next_reward_nova: number }> {
  const user = await getUserById(userId);
  if (!user) throw new HttpError(404, 'Không tìm thấy tài khoản');
  const claimedToday = await getClaimForDate(userId, todayStr());
  return {
    can_claim: !claimedToday,
    streak_days: user.streak_days,
    next_reward_nova: rewardForStreakDay(user.streak_days + 1),
  };
}

export async function claimForUser(userId: string): Promise<{ reward_nova: number; streak_days: number }> {
  const user = await getUserById(userId);
  if (!user) throw new HttpError(404, 'Không tìm thấy tài khoản');

  const today = todayStr();
  if (await getClaimForDate(userId, today)) throw new HttpError(400, 'Bạn đã nhận quà hôm nay rồi');

  const streakDay = nextStreakDay(user.streak_last_date, user.streak_days);
  const reward = rewardForStreakDay(streakDay);

  await withTransaction(async (client) => {
    await createClaim(nanoid(), userId, today, reward, streakDay, client);
    await updateStreak(userId, streakDay, today, client);
    await credit(userId, reward, 'daily_reward', today, client);
  });

  return { reward_nova: reward, streak_days: streakDay };
}
