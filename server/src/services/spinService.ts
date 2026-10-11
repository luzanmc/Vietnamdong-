import { nanoid } from 'nanoid';
import { withTransaction } from '../db/database.js';
import { credit } from './coinService.js';
import { getSpinClaimForDate, createSpinClaim } from '../repositories/spinRepository.js';
import { pickWeightedSegment, SPIN_SEGMENTS } from '../config/spinRewards.js';
import { HttpError } from '../utils/httpError.js';

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function getSpinStatus(userId: string): Promise<{ can_spin: boolean; segments: typeof SPIN_SEGMENTS }> {
  const claimed = await getSpinClaimForDate(userId, todayStr());
  return { can_spin: !claimed, segments: SPIN_SEGMENTS };
}

export async function spinForUser(userId: string): Promise<{ segmentIndex: number; reward: number }> {
  const today = todayStr();
  if (await getSpinClaimForDate(userId, today)) throw new HttpError(400, 'Bạn đã quay hôm nay rồi');

  const { index, segment } = pickWeightedSegment();

  await withTransaction(async (client) => {
    await createSpinClaim(nanoid(), userId, today, segment.reward, client);
    if (segment.reward > 0) await credit(userId, segment.reward, 'spin_reward', today, client);
  });

  return { segmentIndex: index, reward: segment.reward };
}
