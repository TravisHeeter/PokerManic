import { describe, expect, it } from 'vitest';
import { castMateria, createMateriaState, fireValue, materiaKey } from './materia.js';
import type { Card } from '@pokermanic/contracts';

describe('Fire balance', () => {
  it('uses reduced default bonuses', () => {
    expect([1, 2, 3].map(tier => fireValue(tier))).toEqual([10, 30, 100]);
  });
  it('applies custom Fire values to the target', () => {
    const card: Card = { rank: 'A', suit: 'hearts' } as Card;
    const state = { ...createMateriaState(), collection: [{ id: 1, kind: 'fire' as const, xp: 100 }], equipped: [1] };
    const result = castMateria(state, [card], 1, 3, 0, [], [0], [10, 30, 250]);
    expect(result.effects[materiaKey(card)]?.chips).toBe(250);
  });
});
