import { describe, expect, it } from 'vitest';
import { awardRoundUpgradeChips, createRunProgress } from './progression.js';
import type { RunState } from './rounds.js';

describe('perk point rewards', () => {
  it.each([[0, 1], [100, 10], [1000, 31], [10000, 100], [1000000, 1000]])(
    'awards diminishing returns for %i scoring chips',
    (roundChips, expected) => {
      const state = { phase: 'round_won', round: 1, roundChips } as RunState;
      const progress = awardRoundUpgradeChips(state, createRunProgress());
      expect(progress.upgradeChips).toBe(expected);
      expect(progress.rewardedThroughRound).toBe(1);
      expect(() => awardRoundUpgradeChips(state, progress)).toThrow();
    },
  );
});
