export type LevelTier = 'gray' | 'blue' | 'purple' | 'gold' | 'diamond';

export interface LevelInfo {
  level: number;
  currentXp: number;
  nextLevelXp: number | null;
  xpInCurrentLevel: number;
  xpRequiredForNextLevel: number;
  progressPercent: number;
  tier: LevelTier;
  tierName: string;
  bonusChancePercent: number;
  bonusMaxCoin: number;
}

interface LevelConfig {
  minXp: number;
  bonusChancePercent: number;
  minBonusCoin: number;
  maxBonusCoin: number;
}

export const TASK_COMPLETION_XP = 10;
export const DAILY_CLAIM_XP = 5;

export const LEVEL_CONFIGS: Record<number, LevelConfig> = {
  1: { minXp: 0, bonusChancePercent: 0, minBonusCoin: 0, maxBonusCoin: 0 },
  2: { minXp: 50, bonusChancePercent: 0, minBonusCoin: 0, maxBonusCoin: 0 },
  3: { minXp: 120, bonusChancePercent: 0, minBonusCoin: 0, maxBonusCoin: 0 },
  4: { minXp: 210, bonusChancePercent: 0, minBonusCoin: 0, maxBonusCoin: 0 },
  5: { minXp: 320, bonusChancePercent: 1.0, minBonusCoin: 1, maxBonusCoin: 2 },
  6: { minXp: 450, bonusChancePercent: 1.2, minBonusCoin: 1, maxBonusCoin: 2 },
  7: { minXp: 600, bonusChancePercent: 1.4, minBonusCoin: 1, maxBonusCoin: 2 },
  8: { minXp: 770, bonusChancePercent: 1.6, minBonusCoin: 1, maxBonusCoin: 2 },
  9: { minXp: 960, bonusChancePercent: 1.8, minBonusCoin: 1, maxBonusCoin: 2 },
  10: { minXp: 1180, bonusChancePercent: 2.0, minBonusCoin: 1, maxBonusCoin: 3 },
  11: { minXp: 1430, bonusChancePercent: 2.2, minBonusCoin: 1, maxBonusCoin: 3 },
  12: { minXp: 1710, bonusChancePercent: 2.5, minBonusCoin: 1, maxBonusCoin: 3 },
  13: { minXp: 2020, bonusChancePercent: 2.8, minBonusCoin: 1, maxBonusCoin: 3 },
  14: { minXp: 2360, bonusChancePercent: 3.0, minBonusCoin: 1, maxBonusCoin: 3 },
  15: { minXp: 2740, bonusChancePercent: 3.5, minBonusCoin: 2, maxBonusCoin: 4 },
  16: { minXp: 3160, bonusChancePercent: 3.8, minBonusCoin: 2, maxBonusCoin: 4 },
  17: { minXp: 3620, bonusChancePercent: 4.1, minBonusCoin: 2, maxBonusCoin: 4 },
  18: { minXp: 4120, bonusChancePercent: 4.4, minBonusCoin: 2, maxBonusCoin: 4 },
  19: { minXp: 4670, bonusChancePercent: 4.7, minBonusCoin: 2, maxBonusCoin: 4 },
  20: { minXp: 5300, bonusChancePercent: 5.0, minBonusCoin: 2, maxBonusCoin: 5 },
};

export const MAX_LEVEL = 20;

export function getTierFromLevel(level: number): { tier: LevelTier; tierName: string } {
  if (level >= 20) return { tier: 'diamond', tierName: 'Prime VIP' };
  if (level >= 15) return { tier: 'gold', tierName: 'Huyền thoại ' };
  if (level >= 10) return { tier: 'purple', tierName: 'VIP' };
  if (level >= 5) return { tier: 'blue', tierName: 'Member' };
  return { tier: 'gray', tierName: 'Tập sự' };
}

export function calculateLevel(xpInput: number): LevelInfo {
  const safeXp = Math.max(0, Math.floor(Number.isFinite(xpInput) ? xpInput : 0));
  let currentLevel = 1;

  for (let lvl = MAX_LEVEL; lvl >= 1; lvl--) {
    if (safeXp >= LEVEL_CONFIGS[lvl].minXp) {
      currentLevel = lvl;
      break;
    }
  }

  const { tier, tierName } = getTierFromLevel(currentLevel);
  const currentConfig = LEVEL_CONFIGS[currentLevel];
  const isMax = currentLevel >= MAX_LEVEL;

  if (isMax) {
    return {
      level: MAX_LEVEL,
      currentXp: safeXp,
      nextLevelXp: null,
      xpInCurrentLevel: safeXp - currentConfig.minXp,
      xpRequiredForNextLevel: 0,
      progressPercent: 100,
      tier,
      tierName,
      bonusChancePercent: currentConfig.bonusChancePercent,
      bonusMaxCoin: currentConfig.maxBonusCoin,
    };
  }

  const nextConfig = LEVEL_CONFIGS[currentLevel + 1];
  const xpInCurrentLevel = safeXp - currentConfig.minXp;
  const xpRequiredForNextLevel = nextConfig.minXp - currentConfig.minXp;
  const progressPercent = Math.min(
    100,
    Math.max(0, Math.round((xpInCurrentLevel / xpRequiredForNextLevel) * 100))
  );

  return {
    level: currentLevel,
    currentXp: safeXp,
    nextLevelXp: nextConfig.minXp,
    xpInCurrentLevel,
    xpRequiredForNextLevel,
    progressPercent,
    tier,
    tierName,
    bonusChancePercent: currentConfig.bonusChancePercent,
    bonusMaxCoin: currentConfig.maxBonusCoin,
  };
}

export function rollLevelBonus(level: number): number {
  const safeLevel = Math.max(1, Math.min(MAX_LEVEL, Math.floor(level)));
  const config = LEVEL_CONFIGS[safeLevel];
  if (!config || config.bonusChancePercent <= 0 || config.maxBonusCoin <= 0) {
    return 0;
  }

  const roll = Math.random() * 100;
  if (roll < config.bonusChancePercent) {
    const min = config.minBonusCoin;
    const max = config.maxBonusCoin;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  return 0;
}
