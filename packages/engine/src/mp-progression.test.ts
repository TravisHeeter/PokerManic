import { describe, expect, it } from 'vitest';
import { createMateriaState, newMateriaRound, roundMaxMp } from './materia.js';

describe('MP progression', () => {
  it('starts at ten and grows by five per round', () => {
    expect(createMateriaState().mp).toBe(10);
    expect([1, 2, 9, 20].map(round => roundMaxMp(round))).toEqual([10, 15, 50, 105]);
  });
  it('refills to the configured maximum', () => {
    expect(newMateriaRound({ ...createMateriaState(), mp: 0 }, 3, 20, 7).mp).toBe(34);
  });
});
