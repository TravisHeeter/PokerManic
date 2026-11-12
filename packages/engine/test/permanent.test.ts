import { describe, expect, it } from 'vitest';
import { DEFAULT_ROUND_RULES, startRun } from '../src/rounds.js';
import {
  createPermanentProgress, applyPermanentUpgrades, transcendReward,
  transcendRun, buyPermanentUpgrade, permanentUpgradeCost, startingUpgradeChips,
} from '../src/permanent.js';

describe('transcendence and permanent progression', () => {
  it('does not allow farming a prestige reward from the opening round', () => {
    const opening = startRun();
    expect(transcendReward(opening)).toBe(0);
    expect(() => transcendRun(opening, createPermanentProgress())).toThrow();
  });
  it('awards prestige based on cleared rounds, not temporary wallet balance', () => {
    const run = { ...startRun(), phase: 'round_won' as const, round: 6, totalChips: 900 };
    expect(transcendReward(run)).toBe(3);
    const earned = transcendRun(run, createPermanentProgress());
    expect(earned.prestigeChips).toBe(3);
    expect(earned.transcends).toBe(1);
    expect(transcendRun({ ...run, phase: 'game_over' }, earned).prestigeChips).toBe(5);
  });
  it('makes held, played, and discarded card capacity permanent within evaluator caps', () => {
    let profile = { ...createPermanentProgress(), prestigeChips: 100 };
    for (let i = 0; i < 4; i++) profile = buyPermanentUpgrade(profile, 'held_card');
    for (let i = 0; i < 3; i++) {
      profile = buyPermanentUpgrade(profile, 'cards_per_play');
      profile = buyPermanentUpgrade(profile, 'discard_batch');
    }
    const rules = applyPermanentUpgrades(DEFAULT_ROUND_RULES, profile);
    expect(rules.handSize).toBe(12);
    expect(rules.cardsPerPlay).toBe(8);
    expect(rules.maxCardsPerDiscard).toBe(8);
    expect(startRun(rules, () => 0.5).hand).toHaveLength(12);
    expect(permanentUpgradeCost(profile, 'held_card')).toBeNull();
    expect(permanentUpgradeCost(profile, 'cards_per_play')).toBeNull();
    expect(permanentUpgradeCost(profile, 'discard_batch')).toBeNull();
    expect(() => buyPermanentUpgrade(profile, 'held_card')).toThrow('maximum');
  });
  it('permanent upgrades spend only prestige, are capped and improve fresh-run rules', () => {
    let profile = { ...createPermanentProgress(), prestigeChips: 30 };
    profile = buyPermanentUpgrade(profile, 'starting_hand');
    profile = buyPermanentUpgrade(profile, 'starting_discard');
    profile = buyPermanentUpgrade(profile, 'starting_chips');
    expect(applyPermanentUpgrades(DEFAULT_ROUND_RULES, profile).baseHandsPerRound).toBe(5);
    expect(applyPermanentUpgrades(DEFAULT_ROUND_RULES, profile).baseDiscardsPerRound).toBe(4);
    expect(startingUpgradeChips(profile)).toBe(2);
    expect(permanentUpgradeCost(profile, 'starting_hand')).toBe(2);
    profile = buyPermanentUpgrade(profile, 'starting_hand');
    profile = buyPermanentUpgrade(profile, 'starting_hand');
    expect(permanentUpgradeCost(profile, 'starting_hand')).toBeNull();
    expect(() => buyPermanentUpgrade(profile, 'starting_hand')).toThrow();
  });
});
