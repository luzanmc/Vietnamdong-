import type { Queryable } from '../db/database.js';
import { credit } from './coinService.js';
import { getUserById } from '../repositories/userRepository.js';

const REFERRAL_BONUS_PERCENT = 10;

export function calcReferralBonus(rewardAmount: number): number {
  return Math.floor((rewardAmount * REFERRAL_BONUS_PERCENT) / 100);
}

export async function payReferralBonus(userId: string, rewardAmount: number, client?: Queryable): Promise<void> {
  const user = await getUserById(userId);
  if (!user?.referred_by) return;
  const bonus = calcReferralBonus(rewardAmount);
  if (bonus > 0) await credit(user.referred_by, bonus, 'referral_bonus', userId, client);
}
