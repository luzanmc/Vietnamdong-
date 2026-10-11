import { nanoid } from 'nanoid';
import { ACHIEVEMENTS } from '../config/achievements.js';
import { getUnlockedCodes, unlockAchievement, getAchievementStats } from '../repositories/achievementRepository.js';
import { createNotification } from '../repositories/notificationRepository.js';

export async function checkAndUnlockAchievements(userId: string): Promise<string[]> {
  const [unlocked, stats] = await Promise.all([getUnlockedCodes(userId), getAchievementStats(userId)]);
  const newlyUnlocked: string[] = [];

  for (const def of ACHIEVEMENTS) {
    if (unlocked.has(def.code)) continue;
    if (stats[def.metric] < def.target) continue;

    await unlockAchievement(userId, def.code);
    await createNotification(nanoid(), userId, `Đạt thành tựu mới: ${def.titleVi} — ${def.descVi}`, '/achievements');
    newlyUnlocked.push(def.code);
  }

  return newlyUnlocked;
}

export async function getAchievementsForUser(userId: string) {
  const [unlocked, stats] = await Promise.all([getUnlockedCodes(userId), getAchievementStats(userId)]);
  return ACHIEVEMENTS.map((def) => ({
    code: def.code,
    icon: def.icon,
    titleVi: def.titleVi,
    titleEn: def.titleEn,
    descVi: def.descVi,
    descEn: def.descEn,
    target: def.target,
    progress: Math.min(stats[def.metric], def.target),
    unlocked: unlocked.has(def.code),
  }));
}
