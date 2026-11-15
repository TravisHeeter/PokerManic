import { describe, expect, it } from 'vitest';
import { createMateriaState, materiaSaleValue, sellMateria, type MateriaGem } from './materia.js';

describe('Materia sales', () => {
  it.each([[0, 1], [20, 3], [100, 6], [350, 10]])('pays the scaling price for XP %i', (xp, expected) => {
    const gem: MateriaGem = { id: 1, kind: 'prestige', xp };
    expect(materiaSaleValue(gem)).toBe(expected);
  });
  it('removes equipped and cast references while retaining other gems', () => {
    const state = { ...createMateriaState(2),
      collection: [{ id: 1, kind: 'fire' as const, xp: 100 }, { id: 2, kind: 'ice' as const, xp: 0 }],
      equipped: [1, 2], castThisRound: [1, 2] };
    const result = sellMateria(state, 1);
    expect(result.prestigePoints).toBe(6);
    expect(result.materia.collection.map(g => g.id)).toEqual([2]);
    expect(result.materia.equipped).toEqual([null, 2]);
    expect(result.materia.castThisRound).toEqual([2]);
    expect(state.collection).toHaveLength(2);
  });
  it('rejects selling a missing gem', () => {
    expect(() => sellMateria(createMateriaState(), 99)).toThrow('Materia not owned.');
  });
});
