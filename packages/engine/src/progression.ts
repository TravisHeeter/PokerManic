import type { RoundRules, RunState } from './rounds.js';
import { validateRoundRules } from './rounds.js';
import { isRunUpgradeUnlocked, type PermanentProgress } from './permanent.js';

/** Temporary perks; legacy card-capacity levels remain supported in existing run saves. */
export type RunUpgradeId =
  | 'extra_hand'
  | 'extra_discard'
  | 'hand_size'
  | 'cards_per_play'
  | 'discard_batch'
  | 'manual_selection';

export interface RunUpgradeDefinition {
  id: RunUpgradeId;
  label: string;
  description: string;
  baseCost: number;
  maxLevel: number;
}

export const RUN_UPGRADES: readonly RunUpgradeDefinition[] = [
  { id: 'extra_discard', label: '+1 discard', description: 'One more discard action each round.', baseCost: 4, maxLevel: 4 },
  { id: 'hand_size', label: '+1 held card', description: 'Hold an additional card during this run.', baseCost: 6, maxLevel: 4 },
  { id: 'discard_batch', label: '+1 card per discard', description: 'Discard one more card per action, up to eight.', baseCost: 8, maxLevel: 3 },
  { id: 'extra_hand', label: '+1 scoring hand', description: 'One more scoring attempt each round.', baseCost: 10, maxLevel: 4 },
  { id: 'cards_per_play', label: '+1 card per play', description: 'Play six, seven, then eight cards.', baseCost: 14, maxLevel: 3 },
  { id: 'manual_selection', label: 'Manual hand selection', description: 'Choose scoring formations and contributing cards.', baseCost: 18, maxLevel: 1 },
];

export interface RunProgress {
  upgradeChips: number;
  rewardedThroughRound: number;
  levels: Record<RunUpgradeId, number>;
}

export function createRunProgress(): RunProgress {
  return {
    upgradeChips: 0,
    rewardedThroughRound: 0,
    levels: {
      extra_hand: 0,
      extra_discard: 0,
      hand_size: 0,
      cards_per_play: 0,
      discard_batch: 0,
      manual_selection: 0,
    },
  };
}

function definitionFor(id: RunUpgradeId): RunUpgradeDefinition {
  const def = RUN_UPGRADES.find((upgrade) => upgrade.id === id);
  if (!def) throw new RangeError('Unknown upgrade.');
  return def;
}

export function upgradeCost(progress: Readonly<RunProgress>, id: RunUpgradeId): number | null {
  const definition = definitionFor(id);
  const level = progress.levels[id];
  if (!Number.isSafeInteger(level) || level < 0 || level > definition.maxLevel) {
    throw new RangeError('Invalid upgrade level.');
  }
  if (level === definition.maxLevel) return null;
  return definition.baseCost * (level + 1);
}

/** Reward a cleared round once; scoring chips and upgrade chips are distinct. */
export function awardRoundUpgradeChips(
  state: Readonly<RunState>,
  progress: Readonly<RunProgress>,
): RunProgress {
  if (state.phase !== 'round_won') throw new Error('Upgrade chips are awarded only when a round is won.');
  if (state.round <= progress.rewardedThroughRound) {
    throw new Error('Upgrade chips for this round were already collected.');
  }
  if (state.round !== progress.rewardedThroughRound + 1) {
    throw new Error('Rounds must be rewarded in order.');
  }
  const reward = Math.max(1, Math.floor(state.roundChips / 10));
  if (!Number.isSafeInteger(reward) || !Number.isSafeInteger(progress.upgradeChips + reward)) {
    throw new RangeError('Upgrade chip balance exceeded safe precision.');
  }
  return { ...progress, upgradeChips: progress.upgradeChips + reward, rewardedThroughRound: state.round };
}

/** The shop is always available while a run is active, including during rounds. */
export function purchaseRunUpgrade(
  state: Readonly<RunState>,
  progress: Readonly<RunProgress>,
  id: RunUpgradeId,
  permanent: Readonly<PermanentProgress>,
): RunProgress {
  if (state.phase === 'game_over') {
    throw new Error('Cannot buy run-only perks after the run has ended.');
  }
  if (!isRunUpgradeUnlocked(permanent, id)) {
    throw new Error('This perk must be unlocked using prestige chips first.');
  }
  const cost = upgradeCost(progress, id);
  if (cost === null) throw new Error('This perk is already at its maximum level.');
  if (progress.upgradeChips < cost) throw new Error('Not enough upgrade chips.');
  return {
    ...progress,
    upgradeChips: progress.upgradeChips - cost,
    levels: { ...progress.levels, [id]: progress.levels[id] + 1 },
  };
}

export function applyRunUpgrades(
  baseRules: Readonly<RoundRules>,
  progress: Readonly<RunProgress>,
): RoundRules {
  const rules: RoundRules = {
    ...baseRules,
    handSize: baseRules.handSize + progress.levels.hand_size,
    cardsPerPlay: baseRules.cardsPerPlay + progress.levels.cards_per_play,
    maxCardsPerDiscard: baseRules.maxCardsPerDiscard + progress.levels.discard_batch,
    baseHandsPerRound: baseRules.baseHandsPerRound + progress.levels.extra_hand,
    baseDiscardsPerRound: baseRules.baseDiscardsPerRound + progress.levels.extra_discard,
  };
  validateRoundRules(rules);
  return rules;
}

export function manualSelectionUnlocked(progress: Readonly<RunProgress>): boolean {
  return progress.levels.manual_selection > 0;
}
