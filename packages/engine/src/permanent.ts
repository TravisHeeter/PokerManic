import type { RunState } from './rounds.js';
import type { RunUpgradeId } from './progression.js';

/** Prestige unlocks shop availability, never gives free run upgrades. */
export type PermanentUpgradeId = 'starting_discard' | 'held_card' | 'discard_batch'
  | 'starting_hand' | 'cards_per_play' | 'manual_selection'
  | 'starting_chips'; // legacy save key; no longer sold

export interface PermanentProgress {
  prestigeChips: number;
  transcends: number;
  permanentLevels: Record<PermanentUpgradeId, number>;
}

/** Price order corresponds to perceived strategic value. Each is a one-time unlock. */
export const PERMANENT_UPGRADES = [
  { id: 'starting_discard', label: 'Unlock +1 discard', description: 'Allows buying extra discard actions in the run shop.', baseCost: 1, maxLevel: 1 },
  { id: 'held_card', label: 'Unlock +1 held card', description: 'Allows buying extra held cards in the run shop.', baseCost: 2, maxLevel: 1 },
  { id: 'discard_batch', label: 'Unlock +1 card per discard', description: 'Allows buying a larger discard batch in the run shop.', baseCost: 3, maxLevel: 1 },
  { id: 'starting_hand', label: 'Unlock +1 scoring hand', description: 'Allows buying extra scoring hands in the run shop.', baseCost: 4, maxLevel: 1 },
  { id: 'cards_per_play', label: 'Unlock +1 card per play', description: 'Allows buying more cards per play in the run shop.', baseCost: 5, maxLevel: 1 },
  { id: 'manual_selection', label: 'Unlock manual hand selection', description: 'Allows buying manual scoring selection in the run shop.', baseCost: 6, maxLevel: 1 },
] as const;

export function createPermanentProgress(): PermanentProgress {
  return {
    prestigeChips: 0,
    transcends: 0,
    permanentLevels: {
      starting_hand: 0, starting_discard: 0, starting_chips: 0,
      held_card: 0, cards_per_play: 0, discard_batch: 0, manual_selection: 0,
    },
  };
}

const unlockKey: Record<RunUpgradeId, PermanentUpgradeId> = {
  extra_discard: 'starting_discard',
  hand_size: 'held_card',
  discard_batch: 'discard_batch',
  extra_hand: 'starting_hand',
  cards_per_play: 'cards_per_play',
  manual_selection: 'manual_selection',
};
export function isRunUpgradeUnlocked(profile: Readonly<PermanentProgress>, id: RunUpgradeId): boolean {
  return profile.permanentLevels[unlockKey[id]] > 0;
}

export function permanentUpgradeCost(profile: Readonly<PermanentProgress>, id: PermanentUpgradeId): number | null {
  const def = PERMANENT_UPGRADES.find(perk => perk.id === id);
  if (!def) throw new RangeError('Unknown prestige unlock.');
  const level = profile.permanentLevels[id];
  if (!Number.isSafeInteger(level) || level < 0) throw new RangeError('Invalid unlock level.');
  return level > 0 ? null : def.baseCost;
}

export function buyPermanentUpgrade(profile: Readonly<PermanentProgress>, id: PermanentUpgradeId): PermanentProgress {
  const cost = permanentUpgradeCost(profile, id);
  if (cost === null) throw new Error('Shop perk already unlocked.');
  if (!Number.isSafeInteger(profile.prestigeChips) || profile.prestigeChips < cost) {
    throw new Error('Not enough prestige chips.');
  }
  return {
    ...profile,
    prestigeChips: profile.prestigeChips - cost,
    permanentLevels: { ...profile.permanentLevels, [id]: 1 },
  };
}

/** Old permanent chip-starter purchases are honored for preexisting saves only. */
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
