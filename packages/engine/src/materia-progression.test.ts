import { describe, expect, it } from 'vitest';
import { materiaProgress, materiaXpThreshold } from './materia-progression.js';

describe('materia progression', () => {
  it('preserves existing thresholds and extends them for higher levels', () => {
    expect([1, 2, 3, 4, 5].map(materiaXpThreshold)).toEqual([0, 20, 100, 350, 1000]);
  });
  it('shows XP remaining and spell unlocks', () => {
    expect(materiaProgress({ id: 1, kind: 'fire', xp: 19 })).toMatchObject({
      level: 1, xpToNextLevel: 1, nextLevelXp: 20, unlockedSpellTiers: [1], nextUnlock: 'Fira',
    });
    expect(materiaProgress({ id: 1, kind: 'fire', xp: 20 })).toMatchObject({
      level: 2, xpToNextLevel: 80, unlockedSpellTiers: [1, 2], nextUnlock: 'Firaga',
    });
  });
  it('caps progress for max-level materia', () => {
    expect(materiaProgress({ id: 2, kind: 'fortune', xp: 999 })).toMatchObject({
      level: 4, isMaxLevel: false, nextLevelXp: 1000, xpToNextLevel: 1,
    });
    expect(materiaProgress({ id: 2, kind: 'fortune', xp: 1000 })).toMatchObject({
      level: 5, isMaxLevel: true, nextLevelXp: null, xpToNextLevel: 0, progress: 1,
    });
  });
  it('does not modify the original gem', () => {
    const gem = { id: 1, kind: 'ice' as const, xp: 42 };
    materiaProgress(gem);
    expect(gem.xp).toBe(42);
  });
});
