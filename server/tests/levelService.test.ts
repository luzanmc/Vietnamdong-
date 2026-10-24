import { describe, it, expect } from 'vitest';
import { calculateLevel, rollLevelBonus, MAX_LEVEL } from '../src/services/levelService.js';

describe('calculateLevel', () => {
  it('returns level 1 for new user with 0 xp', () => {
    const res = calculateLevel(0);
    expect(res.level).toBe(1);
    expect(res.tier).toBe('gray');
    expect(res.tierName).toBe('Tập sự');
    expect(res.progressPercent).toBe(0);
    expect(res.nextLevelXp).toBe(50);
  });

  it('keeps level 1 right before threshold', () => {
    const res = calculateLevel(49);
    expect(res.level).toBe(1);
    expect(res.progressPercent).toBe(98);
  });

  it('promotes to level 2 at exactly 50 xp', () => {
    const res = calculateLevel(50);
    expect(res.level).toBe(2);
    expect(res.progressPercent).toBe(0);
  });

  it('correctly maps to blue tier at level 5', () => {
    const res = calculateLevel(320);
    expect(res.level).toBe(5);
    expect(res.tier).toBe('blue');
    expect(res.tierName).toBe('Member');
    expect(res.bonusChancePercent).toBeGreaterThan(0);
  });

  it('correctly maps to purple tier at level 10', () => {
    const res = calculateLevel(1180);
    expect(res.level).toBe(10);
    expect(res.tier).toBe('purple');
    expect(res.tierName).toBe('VIP');
  });

  it('correctly maps to gold tier at level 15', () => {
    const res = calculateLevel(2740);
    expect(res.level).toBe(15);
    expect(res.tier).toBe('gold');
    expect(res.tierName).toBe('Huyền thoại ');
  });

  it('caps at max level 20 for large xp', () => {
    const res = calculateLevel(99999);
    expect(res.level).toBe(MAX_LEVEL);
    expect(res.tier).toBe('diamond');
    expect(res.tierName).toBe('Prime VIP');
    expect(res.progressPercent).toBe(100);
    expect(res.nextLevelXp).toBeNull();
  });
});

describe('rollLevelBonus', () => {
  it('returns 0 for level 1 to 4', () => {
    for (let i = 0; i < 20; i++) {
      expect(rollLevelBonus(1)).toBe(0);
      expect(rollLevelBonus(4)).toBe(0);
    }
  });

  it('returns within valid range for level 20', () => {
    for (let i = 0; i < 50; i++) {
      const bonus = rollLevelBonus(20);
      expect(bonus).toBeGreaterThanOrEqual(0);
      expect(bonus).toBeLessThanOrEqual(5);
    }
  });
});
