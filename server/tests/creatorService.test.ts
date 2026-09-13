import { describe, it, expect } from 'vitest';
import { calcCreatorBonus } from '../src/services/creatorService.js';

describe('calcCreatorBonus', () => {
  it('scales with the configured bonus percent', () => {
    expect(calcCreatorBonus(100, 5)).toBe(5);
    expect(calcCreatorBonus(100, 20)).toBe(20);
  });

  it('floors fractional results', () => {
    expect(calcCreatorBonus(7, 50)).toBe(3);
  });
});
