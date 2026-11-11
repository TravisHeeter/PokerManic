import { cardSchema, type Card, type CardRank } from '@pokermanic/contracts';

export type PokerHandCategory =
  | 'high_card'
  | 'pair'
  | 'two_pair'
  | 'three_of_a_kind'
  | 'straight'
  | 'flush'
  | 'full_house'
  | 'four_of_a_kind'
  | 'straight_flush'
  | 'royal_flush';

export interface PokerHandResult {
  category: PokerHandCategory;
  label: string;
  baseChips: number;
  multiplier: number;
  score: number;
}

/**
 * Provisional PokerManic base values. No rank-based card chips, modifiers,
 * jokers, or scoring upgrades are included in Milestone 3.
 */
export const POKER_HAND_VALUES = {
  high_card:       { label: 'High card',       baseChips: 5,   multiplier: 1 },
  pair:            { label: 'Pair',            baseChips: 10,  multiplier: 2 },
  two_pair:        { label: 'Two pair',        baseChips: 20,  multiplier: 2 },
  three_of_a_kind: { label: 'Three of a kind', baseChips: 30,  multiplier: 3 },
  straight:        { label: 'Straight',        baseChips: 30,  multiplier: 4 },
  flush:           { label: 'Flush',           baseChips: 35,  multiplier: 4 },
  full_house:      { label: 'Full house',      baseChips: 40,  multiplier: 4 },
  four_of_a_kind:  { label: 'Four of a kind',  baseChips: 60,  multiplier: 7 },
  straight_flush:  { label: 'Straight flush',  baseChips: 100, multiplier: 8 },
  royal_flush:     { label: 'Royal flush',     baseChips: 125, multiplier: 10 },
} as const satisfies Record<PokerHandCategory, {
  label: string;
  baseChips: number;
  multiplier: number;
}>;

const RANK_VALUE: Record<CardRank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
  '8': 8, '9': 9, '10': 10, J: 11, Q: 12, K: 13, A: 14,
};

/**
 * Recognize and score exactly five distinct standard playing cards.
 * Deterministic, order-independent, and never mutates the caller's cards.
 */
export function evaluatePokerHand(cards: readonly Card[]): PokerHandResult {
  if (cards.length !== 5) {
    throw new RangeError('A poker hand must contain exactly five cards.');
  }

  // Validate runtime input even though TypeScript callers normally supply Card.
  const validCards = cards.map((card) => cardSchema.parse(card));
  const uniqueCards = new Set(validCards.map(({ suit, rank }) => `${suit}:${rank}`));
  if (uniqueCards.size !== 5) {
    throw new RangeError('A poker hand cannot contain duplicate cards.');
  }

  const values = validCards.map((card) => RANK_VALUE[card.rank]).sort((a, b) => a - b);
  const rankCounts = new Map<number, number>();
  for (const value of values) {
    rankCounts.set(value, (rankCounts.get(value) ?? 0) + 1);
  }
  const frequency = [...rankCounts.values()].sort((a, b) => b - a);
  const distinct = rankCounts.size === 5;
  const wheel = distinct && values.join(',') === '2,3,4,5,14';
  const consecutive = distinct && values.every((value, i) => value === values[0]! + i);
  const straight = wheel || consecutive;
  const flush = validCards.every((card) => card.suit === validCards[0]!.suit);

  let category: PokerHandCategory;
  if (flush && straight && values.join(',') === '10,11,12,13,14') {
    category = 'royal_flush';
  } else if (flush && straight) {
    category = 'straight_flush';
  } else if (frequency[0] === 4) {
    category = 'four_of_a_kind';
  } else if (frequency[0] === 3 && frequency[1] === 2) {
    category = 'full_house';
  } else if (flush) {
    category = 'flush';
  } else if (straight) {
    category = 'straight';
  } else if (frequency[0] === 3) {
    category = 'three_of_a_kind';
  } else if (frequency[0] === 2 && frequency[1] === 2) {
    category = 'two_pair';
  } else if (frequency[0] === 2) {
    category = 'pair';
  } else {
    category = 'high_card';
  }

  const { label, baseChips, multiplier } = POKER_HAND_VALUES[category];
  return { category, label, baseChips, multiplier, score: baseChips * multiplier };
}
