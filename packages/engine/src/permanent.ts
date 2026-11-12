import type { RoundRules, RunState } from './rounds.js';
import { validateRoundRules } from './rounds.js';

/** Permanent progression is independent of the temporary run perk wallet. */
export type PermanentUpgradeId = 'starting_hand' | 'starting_discard' | 'starting_chips';

export interface PermanentProgress {
  prestigeChips: number;
  transcends: number;
  permanentLevels: Record<PermanentUpgradeId, number>;
}

export const PERMANENT_UPGRADES = [
  { id: 'starting_hand', label: 'Extra starting hand', description: 'Gain one additional scoring hand each round, permanently.', baseCost: 1, maxLevel: 3 },
  { id: 'starting_discard', label: 'Extra starting discard', description: 'Gain one additional discard each round, permanently.', baseCost: 1, maxLevel: 3 },
  { id: 'starting_chips', label: 'Starting upgrade chips', description: 'Begin every new run with two extra upgrade chips per level.', baseCost: 2, maxLevel: 3 },
] as const;

export function createPermanentProgress(): PermanentProgress {
  return {
    prestigeChips: 0,
    transcends: 0,
    permanentLevels: { starting_hand: 0, starting_discard: 0, starting_chips: 0 },
  };
}

export function permanentUpgradeCost(profile: Readonly<PermanentProgress>, id: PermanentUpgradeId): number | null {
  const def = PERMANENT_UPGRADES.find(perk => perk.id === id);
  if (!def) throw new RangeError('Unknown permanent perk.');
  const level = profile.permanentLevels[id];
  if (!Number.isSafeInteger(level) || level < 0 || level > def.maxLevel) {
    throw new RangeError('Invalid permanent perk level.');
  }
  return level === def.maxLevel ? null : def.baseCost * (level + 1);
}

export function buyPermanentUpgrade(profile: Readonly<PermanentProgress>, id: PermanentUpgradeId): PermanentProgress {
  const cost = permanentUpgradeCost(profile, id);
  if (cost === null) throw new Error('Permanent perk is at its maximum level.');
  if (!Number.isSafeInteger(profile.prestigeChips) || profile.prestigeChips < cost) {
    throw new Error('Not enough prestige chips.');
  }
  return {
    ...profile,
    prestigeChips: profile.prestigeChips - cost,
    permanentLevels: { ...profile.permanentLevels, [id]: profile.permanentLevels[id] + 1 },
  };
}

export function applyPermanentUpgrades(base: Readonly<RoundRules>, profile: Readonly<PermanentProgress>): RoundRules {
  const rules = {
    ...base,
    baseHandsPerRound: base.baseHandsPerRound + profile.permanentLevels.starting_hand,
    baseDiscardsPerRound: base.baseDiscardsPerRound + profile.permanentLevels.starting_discard,
  };
  validateRoundRules(rules);
  return rules;
}

export function startingUpgradeChips(profile: Readonly<PermanentProgress>): number {
  return profile.permanentLevels.starting_chips * 2;
}

/** Prestige is earned from completed rounds, never from wallet purchases. */
export function transcendReward(run: Readonly<RunState>): number {
  const completed = run.phase === 'round_won' ? run.round : run.round - 1;
  return completed >= 2 ? Math.floor(completed / 2) : 0;
}

export function transcendRun(run: Readonly<RunState>, profile: Readonly<PermanentProgress>): PermanentProgress {
  const reward = transcendReward(run);
  if (reward === 0) throw new Error('Complete at least two rounds before transcending.');
  if (!Number.isSafeInteger(profile.prestigeChips + reward) || !Number.isSafeInteger(profile.transcends + 1)) {
    throw new RangeError('Prestige totals exceed safe integer precision.');
  }
  return {
    ...profile,
    prestigeChips: profile.prestigeChips + reward,
    transcends: profile.transcends + 1,
    permanentLevels: { ...profile.permanentLevels },
  };
}
