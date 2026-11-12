import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ROUND_RULES, RUN_UPGRADES, advanceRound, applyRunUpgrades,
  awardRoundUpgradeChips, createRunProgress, manualSelectionUnlocked,
  purchaseRunUpgrade, startRun, upgradeCost, createPermanentProgress, buyPermanentUpgrade,
} from '../src/index';

const won = (round = 1, roundChips = 120) => ({
  ...startRun(DEFAULT_ROUND_RULES, () => 0.5),
  phase: 'round_won' as const,
  round,
  roundChips,
  totalChips: roundChips,
});

const fullUnlocks = {
  ...createPermanentProgress(),
  permanentLevels: {
    starting_discard: 1, held_card: 1, discard_batch: 1,
    starting_hand: 1, cards_per_play: 1, manual_selection: 1, starting_chips: 0,
  },
};

describe('in-run shop with prestige unlock gates', () => {
  it('starts with zero spendable upgrade chips and no unlocked perks', () => {
    const progress = createRunProgress();
    expect(progress.upgradeChips).toBe(0);
    expect(progress.rewardedThroughRound).toBe(0);
    expect(manualSelectionUnlocked(progress)).toBe(false);
    expect(applyRunUpgrades(DEFAULT_ROUND_RULES, progress)).toEqual(DEFAULT_ROUND_RULES);
    expect(RUN_UPGRADES).toHaveLength(6);
    expect(RUN_UPGRADES.map(perk => perk.baseCost)).toEqual([4, 6, 8, 10, 14, 18]);
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
    const reward = { ...awardRoundUpgradeChips(run, createRunProgress()), upgradeChips: 17 };
    const purchased = purchaseRunUpgrade(run, reward, 'extra_hand', fullUnlocks);
    expect(purchased).toMatchObject({upgradeChips:7, levels:{extra_hand:1}});
    expect(upgradeCost(purchased, 'extra_hand')).toBe(20);
    expect(applyRunUpgrades(DEFAULT_ROUND_RULES, purchased).baseHandsPerRound).toBe(5);
    const advanced = advanceRound(run, applyRunUpgrades(DEFAULT_ROUND_RULES, purchased), () => 0.3);
    expect(advanced.handsRemaining).toBe(5);
    expect(run.handsRemaining).toBe(4);
    expect(run.roundChips).toBe(120);
    const duringRound = purchaseRunUpgrade(advanced, purchased, 'extra_discard', fullUnlocks);
    expect(duringRound).toMatchObject({ upgradeChips: 3, levels: { extra_hand: 1, extra_discard: 1 } });
    // The active round's already-established allowance is unaffected.
    expect(advanced.handsRemaining).toBe(5);
    expect(advanced.discardsRemaining).toBe(3);
    expect(() => purchaseRunUpgrade(advanced, createRunProgress(), 'extra_discard', fullUnlocks))
      .toThrow('Not enough');
  });

  it('keeps the shop open while playing and immediately unlocks manual hand selection', () => {
    const rewarded = { ...awardRoundUpgradeChips(won(), createRunProgress()), upgradeChips: 25 };
    const active = advanceRound(won(), DEFAULT_ROUND_RULES, () => 0.5);
    const before = structuredClone(active);
    const purchased = purchaseRunUpgrade(active, rewarded, 'manual_selection', fullUnlocks);
    expect(manualSelectionUnlocked(purchased)).toBe(true);
    expect(purchased.upgradeChips).toBe(7);
    expect(active).toEqual(before);
    // No need to wait for another cleared round to activate the Manual toggle.
    expect(upgradeCost(purchased, 'manual_selection')).toBeNull();
    expect(() => purchaseRunUpgrade(active, purchased, 'manual_selection', fullUnlocks)).toThrow('maximum');
  });

  it('rejects purchases after defeat without making the shop disappear', () => {
    const active = advanceRound(won(), DEFAULT_ROUND_RULES, () => 0.5);
    const progress = awardRoundUpgradeChips(won(), createRunProgress());
    const lost = { ...active, phase: 'game_over' as const };
    expect(() => purchaseRunUpgrade(lost, progress, 'extra_discard', fullUnlocks)).toThrow('run has ended');
    expect(progress.upgradeChips).toBe(12);
  });

  it('locks manual hand choice until the perk is purchased', () => {
    const run = won();
    const rewarded = { ...awardRoundUpgradeChips(run, createRunProgress()), upgradeChips: 25 };
    const bought = purchaseRunUpgrade(run, rewarded, 'manual_selection', fullUnlocks);
    expect(manualSelectionUnlocked(bought)).toBe(true);
    expect(bought.upgradeChips).toBe(7);
    expect(upgradeCost(bought, 'manual_selection')).toBeNull();
    expect(() => purchaseRunUpgrade(run, bought, 'manual_selection', fullUnlocks)).toThrow();
  });

  it('requires prestige unlocks but run purchase spends upgrade chips', () => {
    const rich = { ...createRunProgress(), upgradeChips: 999 };
    for (const perk of RUN_UPGRADES) {
      expect(() => purchaseRunUpgrade(won(), rich, perk.id, createPermanentProgress()))
        .toThrow('unlocked using prestige chips');
      const purchased = purchaseRunUpgrade(won(), rich, perk.id, fullUnlocks);
      expect(purchased.levels[perk.id]).toBe(1);
      expect(purchased.upgradeChips).toBe(999 - perk.baseCost);
      expect(fullUnlocks.prestigeChips).toBe(0);
    }
  });

  it('creates a clean progression state at the next run instead of retaining run-only perks', () => {
    const earned = awardRoundUpgradeChips(won(), createRunProgress());
    const purchased = purchaseRunUpgrade(won(), earned, 'extra_discard', fullUnlocks);
    expect(purchased.levels.extra_discard).toBe(1);
    const fresh = createRunProgress();
    expect(fresh.levels.extra_discard).toBe(0);
    expect(fresh.upgradeChips).toBe(0);
    expect(fresh).not.toBe(purchased);
  });
});
