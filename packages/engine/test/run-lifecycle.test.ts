import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ROUND_RULES, applyRunUpgrades, awardRoundUpgradeChips,
  beginAnotherRun, createPermanentProgress, createRunProgress,
  startRun, transcendRun, type RunState,
} from '../src/index.js';

describe('run transitions', () => {
  const profile = { ...createPermanentProgress(), prestigeChips: 23 };

  it('keeps spendable chips, shop levels, and card modifiers after starting a new run', () => {
    const progress = {
      ...createRunProgress(),
      upgradeChips: 345,
      rewardedThroughRound: 3,
      levels: { ...createRunProgress().levels, hand_size: 2, extra_hand: 1, manual_selection: 1 },
    };
    const original = {
      ...startRun(applyRunUpgrades(DEFAULT_ROUND_RULES, progress), () => 0.5),
      cardModifiers: { 'spades:A': 'gold' as const, 'clubs:Q': 'growing' as const },
      cardGrowth: { 'clubs:Q': 3 },
    };
    const fresh = beginAnotherRun(original, progress, profile, false, () => 0.25);

    expect(fresh.progress.upgradeChips).toBe(345);
    expect(fresh.progress.levels).toEqual(progress.levels);
    expect(fresh.progress.levels).not.toBe(progress.levels);
    expect(fresh.progress.rewardedThroughRound).toBe(0);
    expect(fresh.run.round).toBe(1);
    expect(fresh.run.totalChips).toBe(0);
    expect(fresh.run.cardModifiers).toEqual(original.cardModifiers);
    expect(fresh.run.cardModifiers).not.toBe(original.cardModifiers);
    expect(fresh.run.cardGrowth).toEqual(original.cardGrowth);
    expect(fresh.rules.handSize).toBe(10);
    expect(fresh.run.hand).toHaveLength(10);
    expect(fresh.run.handsRemaining).toBe(5);
    expect(profile.prestigeChips).toBe(23);

    const rewarded = awardRoundUpgradeChips({
      ...fresh.run, phase: 'round_won', roundChips: 100,
    }, fresh.progress);
    expect(rewarded.upgradeChips).toBe(355);
    expect(rewarded.rewardedThroughRound).toBe(1);
    expect(original.cardGrowth['clubs:Q']).toBe(3);
  });

  it('resets earned chips, modifiers, and upgrade levels on transcend, while awarding prestige', () => {
    const progress = {
      ...createRunProgress(), upgradeChips: 475,
      levels: { ...createRunProgress().levels, cards_per_play: 2, discard_batch: 2 },
    };
    const previous: RunState = {
      ...startRun(applyRunUpgrades(DEFAULT_ROUND_RULES, progress), () => 0.5),
      round: 6, phase: 'round_won',
      cardModifiers: { 'hearts:A': 'multiplier' },
    };
    const afterPrestige = transcendRun(previous, profile);
    const fresh = beginAnotherRun(previous, progress, afterPrestige, true, () => 0.25);

    expect(afterPrestige.prestigeChips).toBe(26);
    expect(afterPrestige.transcends).toBe(1);
    expect(fresh.progress.upgradeChips).toBe(0);
    expect(fresh.progress.levels).toEqual(createRunProgress().levels);
    expect(fresh.run.cardModifiers).toEqual({});
    expect(fresh.run.cardGrowth).toEqual({});
    expect(fresh.rules).toEqual(DEFAULT_ROUND_RULES);
    expect(fresh.run.round).toBe(1);
    expect(fresh.run.hand).toHaveLength(8);
  });
});
