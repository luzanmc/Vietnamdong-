import { describe, it, expect } from 'vitest';
import { novaToVnd } from '../src/services/coinService.js';

describe('novaToVnd', () => {
  it('multiplies nova by the exchange rate', () => {
    expect(novaToVnd(100, 1800)).toBe(180_000);
  });

  it('rounds to the nearest integer', () => {
    expect(novaToVnd(3, 1799.5)).toBe(Math.round(3 * 1799.5));
  });

  it('returns 0 for 0 nova', () => {
    expect(novaToVnd(0, 1800)).toBe(0);
  });
});
