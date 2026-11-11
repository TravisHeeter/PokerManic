import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ROUND_RULES, RUN_UPGRADES, advanceRound, applyRunUpgrades,
  awardRoundUpgradeChips, createRunProgress, manualSelectionUnlocked,
  purchaseRunUpgrade, startRun, upgradeCost,
} from '../src/index';

const won = (round = 1, roundChips = 120) => ({
  ...startRun(DEFAULT_ROUND_RULES, () => 0.5),
  phase: 'round_won' as const,
  round,
  roundChips,
  totalChips: roundChips,
});

describe('Milestone 5 in-run upgrade economy', () => {
  it('starts with zero spendable upgrade chips and no unlocked perks', () => {
    const progress = createRunProgress();
    expect(progress.upgradeChips).toBe(0);
    expect(progress.rewardedThroughRound).toBe(0);
    expect(manualSelectionUnlocked(progress)).toBe(false);
    expect(applyRunUpgrades(DEFAULT_ROUND_RULES, progress)).toEqual(DEFAULT_ROUND_RULES);
    expect(RUN_UPGRADES).toHaveLength(6);
  });

  it('awards upgrade chips on victory without spending scoring chips, and only once', () => {
    const run = won(1, 120);
    const originalRun = structuredClone(run);
    const original = createRunProgress();
    const earned = awardRoundUpgradeChips(run, original);
    expect(earned.upgradeChips).toBe(12);
    expect(earned.rewardedThroughRound).toBe(1);
    expect(run.roundChips).toBe(120);
    expect(run).toEqual(originalRun);
    expect(original.upgradeChips).toBe(0);
    expect(() => awardRoundUpgradeChips(run, earned)).toThrow();
    expect(() => awardRoundUpgradeChips(startRun(), original)).toThrow();
    expect(() => awardRoundUpgradeChips({...run,phase:'game_over'}, original)).toThrow();
    expect(() => awardRoundUpgradeChips(won(3), original)).toThrow();
    const second = awardRoundUpgradeChips(won(2, 115), earned);
    expect(second.upgradeChips).toBe(23);
  });

  it('buys perks with separate currency and applies changes only to future round rules', () => {
    const run = won();
    const reward = awardRoundUpgradeChips(run, createRunProgress());
    const purchased = purchaseRunUpgrade(run, reward, 'extra_hand');
    expect(purchased).toMatchObject({upgradeChips:7, levels:{extra_hand:1}});
    expect(upgradeCost(purchased, 'extra_hand')).toBe(10);
    expect(applyRunUpgrades(DEFAULT_ROUND_RULES, purchased).baseHandsPerRound).toBe(5);
    const advanced = advanceRound(run, applyRunUpgrades(DEFAULT_ROUND_RULES, purchased), () => 0.3);
    expect(advanced.handsRemaining).toBe(5);
    expect(run.handsRemaining).toBe(4);
    expect(run.roundChips).toBe(120);
    expect(() => purchaseRunUpgrade(advanced, purchased, 'extra_discard')).toThrow();
    expect(() => purchaseRunUpgrade(run, createRunProgress(), 'extra_discard')).toThrow();
  });

  it('locks manual hand choice until the perk is purchased', () => {
    const run = won();
    const rewarded = awardRoundUpgradeChips(run, createRunProgress());
    const bought = purchaseRunUpgrade(run, rewarded, 'manual_selection');
    expect(manualSelectionUnlocked(bought)).toBe(true);
    expect(bought.upgradeChips).toBe(2);
    expect(upgradeCost(bought, 'manual_selection')).toBeNull();
    expect(() => purchaseRunUpgrade(run, bought, 'manual_selection')).toThrow();
  });

  it('enforces costs, caps and the future configurable limits', () => {
    const run = won();
    const poor = {...createRunProgress(), rewardedThroughRound:1};
    expect(() => purchaseRunUpgrade(run, poor, 'hand_size')).toThrow('Not enough');
    const rich = {...poor,upgradeChips:9999};
    let purchased = rich;
    for (let i = 0; i < 4; i++) purchased = purchaseRunUpgrade(run, purchased, 'hand_size');
    expect(applyRunUpgrades(DEFAULT_ROUND_RULES,purchased).handSize).toBe(12);
    expect(upgradeCost(purchased,'hand_size')).toBeNull();
    expect(() => purchaseRunUpgrade(run,purchased,'hand_size')).toThrow();
    let more = purchased;
    for (let i = 0; i < 3; i++) {
      more = purchaseRunUpgrade(run,more,'cards_per_play');
      more = purchaseRunUpgrade(run,more,'discard_batch');
    }
    const rules = applyRunUpgrades(DEFAULT_ROUND_RULES,more);
    expect(rules.cardsPerPlay).toBe(8);
    expect(rules.maxCardsPerDiscard).toBe(8);
    expect(advanceRound(run,rules,() => 0.5).hand).toHaveLength(12);
  });

  it('creates a clean progression state at the next run instead of retaining run-only perks', () => {
    const earned = awardRoundUpgradeChips(won(), createRunProgress());
    const purchased = purchaseRunUpgrade(won(), earned, 'extra_discard');
    expect(purchased.levels.extra_discard).toBe(1);
    const fresh = createRunProgress();
    expect(fresh.levels.extra_discard).toBe(0);
    expect(fresh.upgradeChips).toBe(0);
    expect(fresh).not.toBe(purchased);
  });
});
