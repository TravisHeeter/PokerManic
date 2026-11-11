import type { Card } from '@pokermanic/contracts';
import { createStandardDeck, dealCards, shuffleDeck } from './deck.js';
import { listEligiblePokerHands, resolveScoringOption, type HandSelectionSettings, type ScoringOption } from './choices.js';

/**
 * One run's mechanical configuration. Defaults are preliminary and designed
 * to be changed by run/permanent upgrades later, not spread across UI code.
 */
export interface RoundRules {
  handSize: number;
  cardsPerPlay: number;
  maxCardsPerDiscard: number;
  baseHandsPerRound: number;
  baseDiscardsPerRound: number;
  extraHandEveryRounds: number;
  extraDiscardEveryRounds: number;
  baseChipTarget: number;
  chipTargetStep: number;
  chipTargetAcceleration: number;
}

export const DEFAULT_ROUND_RULES: Readonly<RoundRules> = Object.freeze({
  handSize: 8,
  cardsPerPlay: 5,
  maxCardsPerDiscard: 5,
  baseHandsPerRound: 4,
  baseDiscardsPerRound: 3,
  extraHandEveryRounds: 4,
  extraDiscardEveryRounds: 6,
  baseChipTarget: 60,
  chipTargetStep: 40,
  chipTargetAcceleration: 15,
});

export type RunPhase = 'playing' | 'round_won' | 'game_over';

export interface RunState {
  phase: RunPhase;
  round: number;
  roundTarget: number;
  roundChips: number;
  totalChips: number;
  handsRemaining: number;
  discardsRemaining: number;
  handsPlayed: number;
  hand: Card[];
  drawPile: Card[];
  playedCards: Card[];
  discardedCards: Card[];
  lastScored: ScoringOption | null;
}

function validateRuleInteger(value: number, name: string, minimum: number): void {
  if (!Number.isSafeInteger(value) || value < minimum) {
    throw new RangeError(`${name} must be a safe integer >= ${minimum}.`);
  }
}

export function validateRoundRules(rules: Readonly<RoundRules>): void {
  validateRuleInteger(rules.handSize, 'handSize', 1);
  validateRuleInteger(rules.cardsPerPlay, 'cardsPerPlay', 1);
  validateRuleInteger(rules.maxCardsPerDiscard, 'maxCardsPerDiscard', 1);
  validateRuleInteger(rules.baseHandsPerRound, 'baseHandsPerRound', 1);
  validateRuleInteger(rules.baseDiscardsPerRound, 'baseDiscardsPerRound', 0);
  validateRuleInteger(rules.extraHandEveryRounds, 'extraHandEveryRounds', 1);
  validateRuleInteger(rules.extraDiscardEveryRounds, 'extraDiscardEveryRounds', 1);
  validateRuleInteger(rules.baseChipTarget, 'baseChipTarget', 1);
  validateRuleInteger(rules.chipTargetStep, 'chipTargetStep', 0);
  validateRuleInteger(rules.chipTargetAcceleration, 'chipTargetAcceleration', 0);
  if (rules.handSize > 52 || rules.cardsPerPlay > rules.handSize || rules.cardsPerPlay > 8
    || rules.maxCardsPerDiscard > rules.handSize) {
    throw new RangeError('Card limits must fit the current 52-card deck and eight-card evaluator.');
  }
}

function checkedRound(round: number, rules: Readonly<RoundRules>): void {
  validateRoundRules(rules);
  validateRuleInteger(round, 'round', 1);
}

export function getRoundTarget(round: number, rules: Readonly<RoundRules> = DEFAULT_ROUND_RULES): number {
  checkedRound(round, rules);
  const completed = round - 1;
  const value = rules.baseChipTarget + rules.chipTargetStep * completed
    + rules.chipTargetAcceleration * completed * completed;
  if (!Number.isSafeInteger(value)) throw new RangeError('Round target exceeds safe integer precision.');
  return value;
}

export function getRoundHands(round: number, rules: Readonly<RoundRules> = DEFAULT_ROUND_RULES): number {
  checkedRound(round, rules);
  const count = rules.baseHandsPerRound + Math.floor((round - 1) / rules.extraHandEveryRounds);
  if (!Number.isSafeInteger(count)) throw new RangeError('Hand allowance exceeds safe integer precision.');
  return count;
}

export function getRoundDiscards(round: number, rules: Readonly<RoundRules> = DEFAULT_ROUND_RULES): number {
  checkedRound(round, rules);
  const count = rules.baseDiscardsPerRound + Math.floor((round - 1) / rules.extraDiscardEveryRounds);
  if (!Number.isSafeInteger(count)) throw new RangeError('Discard allowance exceeds safe integer precision.');
  return count;
}

function freshRound(round: number, totalChips: number, rules: Readonly<RoundRules>, random: () => number): RunState {
  const { hand, remainingDeck } = dealCards(shuffleDeck(createStandardDeck(), random), rules.handSize);
  return {
    phase: 'playing',
    round,
    roundTarget: getRoundTarget(round, rules),
    roundChips: 0,
    totalChips,
    handsRemaining: getRoundHands(round, rules),
    discardsRemaining: getRoundDiscards(round, rules),
    handsPlayed: 0,
    hand,
    drawPile: remainingDeck,
    playedCards: [],
    discardedCards: [],
    lastScored: null,
  };
}

/** Start a fresh run; deterministic when random is injected (including Nuxt SSR). */
export function startRun(
  rules: Readonly<RoundRules> = DEFAULT_ROUND_RULES,
  random: () => number = Math.random,
): RunState {
  validateRoundRules(rules);
  return freshRound(1, 0, rules, random);
}

/** Begin the next round ONLY after beating the current target. */
export function advanceRound(
  state: Readonly<RunState>,
  rules: Readonly<RoundRules> = DEFAULT_ROUND_RULES,
  random: () => number = Math.random,
): RunState {
  if (state.phase !== 'round_won') {
    throw new Error('The next round is available only after meeting the chip target.');
  }
  return freshRound(state.round + 1, state.totalChips, rules, random);
}

function activeRound(state: Readonly<RunState>): void {
  if (state.phase !== 'playing') throw new Error('No further actions can be taken after this round ends.');
}

function selectedIndices(indices: readonly number[], handSize: number, minimum: number, maximum: number): number[] {
  if (indices.length < minimum || indices.length > maximum
    || new Set(indices).size !== indices.length
    || indices.some((index) => !Number.isInteger(index) || index < 0 || index >= handSize)) {
    throw new RangeError(`Select ${minimum === maximum ? minimum : `${minimum} to ${maximum}`} distinct cards from the hand.`);
  }
  return [...indices].sort((a, b) => a - b);
}

function replacePlayedCards(state: Readonly<RunState>, indices: readonly number[]): {
  hand: Card[];
  drawPile: Card[];
  removed: Card[];
} {
  const selected = new Set(indices);
  const kept = state.hand.filter((_, index) => !selected.has(index));
  const removed = state.hand.filter((_, index) => selected.has(index));
  const replacements = dealCards(state.drawPile, Math.min(removed.length, state.drawPile.length));
  return {
    hand: [...kept, ...replacements.hand],
    drawPile: replacements.remainingDeck,
    removed,
  };
}

/** Commit all five selected cards; only the chosen qualifying subset contributes chips. */
export function playScoringHand(
  state: Readonly<RunState>,
  indices: readonly number[],
  settings: Readonly<HandSelectionSettings> = { manualSelectionUnlocked: false, selectionMode: 'automatic' },
  manualOptionId?: string,
  rules: Readonly<RoundRules> = DEFAULT_ROUND_RULES,
): RunState {
  validateRoundRules(rules);
  activeRound(state);
  if (state.handsRemaining <= 0) throw new Error('No scoring hands remain.');
  const chosen = selectedIndices(indices, state.hand.length, rules.cardsPerPlay, rules.cardsPerPlay);
  const cards = chosen.map((index) => state.hand[index]!);
  const options = listEligiblePokerHands(cards);
  const manual = settings.manualSelectionUnlocked && settings.selectionMode === 'manual';
  if (manual && manualOptionId && !options.some((option) => option.id === manualOptionId)) {
    throw new RangeError('The selected scoring option is not eligible for these cards.');
  }
  const selected = resolveScoringOption(options, settings, manualOptionId);
  if (!selected) throw new Error('No eligible scoring option found.');
  const updatedChips = state.roundChips + selected.score;
  const updatedTotal = state.totalChips + selected.score;
  if (!Number.isSafeInteger(updatedChips) || !Number.isSafeInteger(updatedTotal)) {
    throw new RangeError('Score exceeds safe integer precision.');
  }
  const next = replacePlayedCards(state, chosen);
  const handsRemaining = state.handsRemaining - 1;
  const won = updatedChips >= state.roundTarget;
  const lost = !won && (handsRemaining === 0 || next.hand.length < rules.cardsPerPlay);
  return {
    ...state,
    ...next,
    phase: won ? 'round_won' : lost ? 'game_over' : 'playing',
    roundChips: updatedChips,
    totalChips: updatedTotal,
    handsRemaining,
    handsPlayed: state.handsPlayed + 1,
    playedCards: [...state.playedCards, ...next.removed],
    lastScored: selected,
  };
}

/** Discard 1..maxCardsPerDiscard unscored cards, replacing them from the draw pile. */
export function discardCards(
  state: Readonly<RunState>,
  indices: readonly number[],
  rules: Readonly<RoundRules> = DEFAULT_ROUND_RULES,
): RunState {
  validateRoundRules(rules);
  activeRound(state);
  if (state.discardsRemaining <= 0) throw new Error('No discards remain.');
  const chosen = selectedIndices(indices, state.hand.length, 1, rules.maxCardsPerDiscard);
  if (chosen.length > state.drawPile.length) {
    throw new Error('Not enough cards remain in the draw pile for this discard.');
  }
  const next = replacePlayedCards(state, chosen);
  return {
    ...state,
    ...next,
    discardsRemaining: state.discardsRemaining - 1,
    discardedCards: [...state.discardedCards, ...next.removed],
    lastScored: null,
  };
}
