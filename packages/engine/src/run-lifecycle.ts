import type { PermanentProgress } from './permanent.js';
import { startingUpgradeChips } from './permanent.js';
import { applyRunUpgrades, createRunProgress, type RunProgress } from './progression.js';
import { DEFAULT_ROUND_RULES, startRun, type RoundRules, type RunState } from './rounds.js';

export interface NewRunState {
  run: RunState;
  progress: RunProgress;
  rules: RoundRules;
}

/**
 * Starting another run keeps earned currency and purchased card/shop upgrades.
 * Transcending is the only reset boundary for those upgrades.
 * Per-run scoring and reward bookkeeping always restart at round one.
 */
export function beginAnotherRun(
  previousRun: Readonly<RunState>,
  previousProgress: Readonly<RunProgress>,
  profile: Readonly<PermanentProgress>,
  transcend = false,
  random: () => number = Math.random,
): NewRunState {
  const progress: RunProgress = transcend
    ? { ...createRunProgress(), upgradeChips: startingUpgradeChips(profile) }
    : {
        ...previousProgress,
        rewardedThroughRound: 0,
        levels: { ...previousProgress.levels },
      };
  const rules = applyRunUpgrades(DEFAULT_ROUND_RULES, progress);
  const run = {
    ...startRun(rules, random),
    cardModifiers: transcend ? {} : { ...previousRun.cardModifiers },
    cardGrowth: transcend ? {} : { ...previousRun.cardGrowth },
  };
  return { run, progress, rules };
}
