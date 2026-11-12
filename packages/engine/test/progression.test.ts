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
    expect(RUN_UPGRADES).toHaveLength(3);
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
    const duringRound = purchaseRunUpgrade(advanced, purchased, 'extra_discard');
    expect(duringRound).toMatchObject({ upgradeChips: 3, levels: { extra_hand: 1, extra_discard: 1 } });
    // The active round's already-established allowance is unaffected.
    expect(advanced.handsRemaining).toBe(5);
    expect(advanced.discardsRemaining).toBe(3);
    expect(() => purchaseRunUpgrade(advanced, createRunProgress(), 'extra_discard'))
      .toThrow('Not enough');
  });

  it('keeps the shop open while playing and immediately unlocks manual hand selection', () => {
    const rewarded = awardRoundUpgradeChips(won(), createRunProgress());
    const active = advanceRound(won(), DEFAULT_ROUND_RULES, () => 0.5);
    const before = structuredClone(active);
    const purchased = purchaseRunUpgrade(active, rewarded, 'manual_selection');
    expect(manualSelectionUnlocked(purchased)).toBe(true);
    expect(purchased.upgradeChips).toBe(2);
    expect(active).toEqual(before);
    // No need to wait for another cleared round to activate the Manual toggle.
    expect(upgradeCost(purchased, 'manual_selection')).toBeNull();
    expect(() => purchaseRunUpgrade(active, purchased, 'manual_selection')).toThrow('maximum');
  });

  it('rejects purchases after defeat without making the shop disappear', () => {
    const active = advanceRound(won(), DEFAULT_ROUND_RULES, () => 0.5);
    const progress = awardRoundUpgradeChips(won(), createRunProgress());
    const lost = { ...active, phase: 'game_over' as const };
    expect(() => purchaseRunUpgrade(lost, progress, 'extra_discard')).toThrow('run has ended');
    expect(progress.upgradeChips).toBe(12);
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

  it('blocks card capacity in the temporary shop, but preserves saved legacy levels', () => {
    const rich = { ...createRunProgress(), upgradeChips: 999 };
    for (const id of ['hand_size', 'cards_per_play', 'discard_batch'] as const) {
      expect(() => purchaseRunUpgrade(won(), rich, id)).toThrow('permanent prestige');
      expect(RUN_UPGRADES.some(perk => perk.id === id)).toBe(false);
    }
    const legacy = { ...rich, levels: { ...rich.levels, hand_size: 1, cards_per_play: 1, discard_batch: 1 } };
    const rules = applyRunUpgrades(DEFAULT_ROUND_RULES, legacy);
    expect(rules.handSize).toBe(9);
    expect(rules.cardsPerPlay).toBe(6);
    expect(rules.maxCardsPerDiscard).toBe(6);
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
