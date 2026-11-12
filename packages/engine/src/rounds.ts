import type { Card } from '@pokermanic/contracts';
import { applyCardModifiers, type CardModifierMap } from './modifiers.js';
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
  cardModifiers?: CardModifierMap;
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

function freshRound(round: number, totalChips: number, rules: Readonly<RoundRules>, random: () => number, cardModifiers: CardModifierMap = {}): RunState {
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
    cardModifiers,
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
  return freshRound(state.round + 1, state.totalChips, rules, random, { ...state.cardModifiers });
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

function replaceCards(
  state: Readonly<RunState>,
  indices: readonly number[],
  destination: 'played' | 'discarded',
  random: () => number,
): Pick<RunState, 'hand' | 'drawPile' | 'playedCards' | 'discardedCards'> & { recycled: boolean } {
  const selected = new Set(indices);
  const kept = state.hand.filter((_, index) => !selected.has(index));
  const removed = state.hand.filter((_, index) => selected.has(index));
  let drawPile = [...state.drawPile];
  let playedCards = destination === 'played'
    ? [...state.playedCards, ...removed] : [...state.playedCards];
  let discardedCards = destination === 'discarded'
    ? [...state.discardedCards, ...removed] : [...state.discardedCards];
  const replacements: Card[] = [];
  let recycled = false;

  while (replacements.length < removed.length) {
    if (!drawPile.length) {
      const recyclable = [...playedCards, ...discardedCards];
      if (!recyclable.length) break;
      drawPile = shuffleDeck(recyclable, random);
      playedCards = [];
      discardedCards = [];
      recycled = true;
    }
    const draw = dealCards(drawPile, Math.min(removed.length - replacements.length, drawPile.length));
    replacements.push(...draw.hand);
    drawPile = draw.remainingDeck;
  }
  return {
    hand: [...kept, ...replacements],
    drawPile,
    playedCards,
    discardedCards,
    recycled,
  };
}

/**
 * Apply a purchased upgrade immediately without restarting the round or
 * changing selected-card indices. Run scoring chips, phase and earned target
 * stay untouched. Only increased allowances are added; spent actions are not
 * replenished.
 */
export function applyPurchasedRuleUpgrade(
  state: Readonly<RunState>,
  previous: Readonly<RoundRules>,
  upgraded: Readonly<RoundRules>,
  random: () => number = Math.random,
): RunState {
  validateRoundRules(previous);
  validateRoundRules(upgraded);
  if (state.phase === 'game_over') {
    throw new Error('No run upgrades are available after defeat.');
  }
  if (state.hand.length !== previous.handSize) {
    throw new Error('The current hand does not match its active size limit.');
  }
  const modified = ['handSize', 'cardsPerPlay', 'maxCardsPerDiscard',
    'baseHandsPerRound', 'baseDiscardsPerRound'] as const;
  for (const key of modified) {
    if (upgraded[key] < previous[key]) {
      throw new RangeError('Purchasing perks cannot reduce a gameplay limit.');
    }
  }
  const fixed = ['baseChipTarget', 'chipTargetStep', 'chipTargetAcceleration',
    'extraHandEveryRounds', 'extraDiscardEveryRounds'] as const;
  if (fixed.some((key) => upgraded[key] !== previous[key])) {
    throw new RangeError('Purchasing perks cannot modify the target formula or round cadence.');
  }

  const added = upgraded.handSize - previous.handSize;
  let drawPile = [...state.drawPile];
  let playedCards = [...state.playedCards];
  let discardedCards = [...state.discardedCards];
  const extraCards: Card[] = [];

  while (extraCards.length < added) {
    if (drawPile.length === 0) {
      // Recycle only previously used cards; held and drawn cards stay unique.
      const recycled = [...playedCards, ...discardedCards];
      if (!recycled.length) throw new Error('No cards available for the extra held-card slot.');
      drawPile = shuffleDeck(recycled, random);
      playedCards = [];
      discardedCards = [];
    }
    const draw = dealCards(drawPile, Math.min(added - extraCards.length, drawPile.length));
    extraCards.push(...draw.hand);
    drawPile = draw.remainingDeck;
  }

  const handsRemaining = state.handsRemaining + upgraded.baseHandsPerRound - previous.baseHandsPerRound;
  const discardsRemaining = state.discardsRemaining + upgraded.baseDiscardsPerRound - previous.baseDiscardsPerRound;
  if (!Number.isSafeInteger(handsRemaining) || !Number.isSafeInteger(discardsRemaining)) {
    throw new RangeError('The action allowance exceeded safe integer precision.');
  }

  return {
    ...state,
    hand: [...state.hand, ...extraCards],
    drawPile,
    playedCards,
    discardedCards,
    handsRemaining,
    discardsRemaining,
  };
}

/** Commit 1..maxCardsPerPlay selected cards; only the chosen scoring subset contributes chips. */
export function playScoringHand(
  state: Readonly<RunState>,
  indices: readonly number[],
  settings: Readonly<HandSelectionSettings> = { manualSelectionUnlocked: false, selectionMode: 'automatic' },
  manualOptionId?: string,
  rules: Readonly<RoundRules> = DEFAULT_ROUND_RULES,
  random: () => number = Math.random,
): RunState {
  validateRoundRules(rules);
  activeRound(state);
  if (state.handsRemaining <= 0) throw new Error('No scoring hands remain.');
  const chosen = selectedIndices(indices, state.hand.length, 1, rules.cardsPerPlay);
  const cards = chosen.map((index) => state.hand[index]!);
  const options = listEligiblePokerHands(cards);
  const manual = settings.manualSelectionUnlocked && settings.selectionMode === 'manual';
  if (manual && manualOptionId && !options.some((option) => option.id === manualOptionId)) {
    throw new RangeError('The selected scoring option is not eligible for these cards.');
  }
  const option = resolveScoringOption(options, settings, manualOptionId);
  if (!option) throw new Error('No eligible scoring option found.');
  const selected = applyCardModifiers(option, cards, state.cardModifiers);
  const updatedChips = state.roundChips + selected.score;
  const updatedTotal = state.totalChips + selected.score;
  if (!Number.isSafeInteger(updatedChips) || !Number.isSafeInteger(updatedTotal)) {
    throw new RangeError('Score exceeds safe integer precision.');
  }
  const next = replaceCards(state, chosen, 'played', random);
  const handsRemaining = state.handsRemaining - 1;
  const won = updatedChips >= state.roundTarget;
  const lost = !won && handsRemaining === 0;
  return {
    ...state,
    hand: next.hand,
    drawPile: next.drawPile,
    playedCards: next.playedCards,
    discardedCards: next.discardedCards,
    phase: won ? 'round_won' : lost ? 'game_over' : 'playing',
    roundChips: updatedChips,
    totalChips: updatedTotal,
    handsRemaining,
    handsPlayed: state.handsPlayed + 1,
    lastScored: selected,
  };
}

/** Discard 1..maxCardsPerDiscard unscored cards; recycle used cards when needed. */
export function discardCards(
  state: Readonly<RunState>,
  indices: readonly number[],
  rules: Readonly<RoundRules> = DEFAULT_ROUND_RULES,
  random: () => number = Math.random,
): RunState {
  validateRoundRules(rules);
  activeRound(state);
  if (state.discardsRemaining <= 0) throw new Error('No discards remain.');
  const chosen = selectedIndices(indices, state.hand.length, 1, rules.maxCardsPerDiscard);
  const next = replaceCards(state, chosen, 'discarded', random);
  return {
    ...state,
    hand: next.hand,
    drawPile: next.drawPile,
    playedCards: next.playedCards,
    discardedCards: next.discardedCards,
    discardsRemaining: state.discardsRemaining - 1,
    lastScored: null,
  };
}
