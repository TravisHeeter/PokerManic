import { describe, expect, it } from 'vitest';
import { DEFAULT_ROUND_RULES, startRun } from '../src/rounds.js';
import {
  createPermanentProgress, isRunUpgradeUnlocked, transcendReward, transcendRun,
  buyPermanentUpgrade, permanentUpgradeCost, startingUpgradeChips,
} from '../src/permanent.js';

describe('prestige unlocks', () => {
  it('requires completed rounds for prestige currency', () => {
    const opening = startRun();
    expect(transcendReward(opening)).toBe(0);
    expect(() => transcendRun(opening, createPermanentProgress())).toThrow();
    const won = { ...opening, phase: 'round_won' as const, round: 6 };
    const earned = transcendRun(won, createPermanentProgress());
    expect(earned.prestigeChips).toBe(3);
    expect(earned.transcends).toBe(1);
  });
  it('unlocks each perk exactly once without changing any run rules', () => {
    let profile = { ...createPermanentProgress(), prestigeChips: 30 };
    const pairs = [
      ['starting_discard', 'extra_discard', 1],
      ['held_card', 'hand_size', 2],
      ['discard_batch', 'discard_batch', 3],
      ['starting_hand', 'extra_hand', 4],
      ['cards_per_play', 'cards_per_play', 5],
      ['manual_selection', 'manual_selection', 6],
    ] as const;
    for (const [unlock, perk, price] of pairs) {
      expect(isRunUpgradeUnlocked(profile, perk)).toBe(false);
      expect(permanentUpgradeCost(profile, unlock)).toBe(price);
      profile = buyPermanentUpgrade(profile, unlock);
      expect(isRunUpgradeUnlocked(profile, perk)).toBe(true);
      expect(permanentUpgradeCost(profile, unlock)).toBeNull();
      expect(() => buyPermanentUpgrade(profile, unlock)).toThrow('already unlocked');
    }
    expect(profile.prestigeChips).toBe(9);
    expect(DEFAULT_ROUND_RULES.handSize).toBe(8);
    expect(startRun(DEFAULT_ROUND_RULES, () => 0.5).hand).toHaveLength(8);
  });
  it('recognizes old permanent hand/discard level purchases as unlocks', () => {
    const profile = {
      ...createPermanentProgress(),
      permanentLevels: { ...createPermanentProgress().permanentLevels,
        starting_hand: 3, starting_discard: 2, starting_chips: 2 },
    };
    expect(isRunUpgradeUnlocked(profile, 'extra_hand')).toBe(true);
    expect(isRunUpgradeUnlocked(profile, 'extra_discard')).toBe(true);
    expect(startingUpgradeChips(profile)).toBe(4);
  });
});
