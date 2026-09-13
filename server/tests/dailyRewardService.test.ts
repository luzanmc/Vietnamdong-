import { describe, it, expect } from 'vitest';
import { rewardForStreakDay, nextStreakDay, todayStr, yesterdayStr } from '../src/services/dailyRewardService.js';

describe('rewardForStreakDay', () => {
  it('scales linearly up to day 7', () => {
    expect(rewardForStreakDay(1, 1)).toBe(1);
    expect(rewardForStreakDay(4, 1)).toBe(4);
    expect(rewardForStreakDay(7, 1)).toBe(7);
  });

  it('caps at day 7 reward for any longer streak', () => {
    expect(rewardForStreakDay(8, 1)).toBe(7);
    expect(rewardForStreakDay(30, 1)).toBe(7);
  });

  it('scales with a non-1 base reward', () => {
    expect(rewardForStreakDay(3, 2)).toBe(6);
  });
});

describe('nextStreakDay', () => {
  it('continues the streak when the last claim was yesterday', () => {
    const now = new Date('2026-07-27T12:00:00Z');
    expect(nextStreakDay(yesterdayStr(now), 4, now)).toBe(5);
  });

  it('resets to day 1 when the last claim was not yesterday', () => {
    const now = new Date('2026-07-27T12:00:00Z');
    expect(nextStreakDay('2026-07-01', 15, now)).toBe(1);
  });

  it('resets to day 1 for a first-ever claim (null last date)', () => {
    const now = new Date('2026-07-27T12:00:00Z');
    expect(nextStreakDay(null, 0, now)).toBe(1);
  });

  it('does not count today itself as yesterday', () => {
    const now = new Date('2026-07-27T12:00:00Z');
    expect(nextStreakDay(todayStr(now), 4, now)).toBe(1);
  });
});
