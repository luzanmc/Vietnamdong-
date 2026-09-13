import { describe, it, expect } from 'vitest';
import { calcReferralBonus } from '../src/services/referralService.js';

describe('calcReferralBonus', () => {
  it('pays 10% of the reward, floored', () => {
    expect(calcReferralBonus(100)).toBe(10);
    expect(calcReferralBonus(3)).toBe(0);
    expect(calcReferralBonus(25)).toBe(2);
  });

  it('never returns a negative amount', () => {
    expect(calcReferralBonus(0)).toBe(0);
  });
});
