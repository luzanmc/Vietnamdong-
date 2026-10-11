import { withTransaction } from '../db/database.js';
import { credit } from './coinService.js';
import { QUESTS, currentPeriodKey, periodStart } from '../config/quests.js';
import { countTasksCompletedSince, isQuestClaimed, markQuestClaimed } from '../repositories/questRepository.js';
import { HttpError } from '../utils/httpError.js';

export async function getQuestsForUser(userId: string) {
  const results = [];
  for (const quest of QUESTS) {
    const periodKey = currentPeriodKey(quest.period);
    const since = periodStart(quest.period);
    const [progress, claimed] = await Promise.all([
      countTasksCompletedSince(userId, since),
      isQuestClaimed(userId, quest.code, periodKey),
    ]);
    results.push({
      code: quest.code,
      titleVi: quest.titleVi,
      titleEn: quest.titleEn,
      descVi: quest.descVi,
      descEn: quest.descEn,
      target: quest.target,
      reward: quest.reward,
      progress: Math.min(progress, quest.target),
      canClaim: progress >= quest.target && !claimed,
      claimed,
    });
  }
  return results;
}

export async function claimQuest(userId: string, questCode: string): Promise<{ reward: number }> {
  const quest = QUESTS.find((q) => q.code === questCode);
  if (!quest) throw new HttpError(404, 'Nhiệm vụ không tồn tại');

  const periodKey = currentPeriodKey(quest.period);
  const since = periodStart(quest.period);

  if (await isQuestClaimed(userId, questCode, periodKey)) throw new HttpError(400, 'Bạn đã nhận thưởng nhiệm vụ này rồi');

  const progress = await countTasksCompletedSince(userId, since);
  if (progress < quest.target) throw new HttpError(400, 'Chưa đạt điều kiện nhận thưởng');

  await withTransaction(async (client) => {
    await markQuestClaimed(userId, questCode, periodKey, client);
    await credit(userId, quest.reward, 'quest_reward', periodKey, client);
  });

  return { reward: quest.reward };
}
