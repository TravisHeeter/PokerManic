import { describe, expect, it } from 'vitest';
import type { Card, CardRank, CardSuit } from '@pokermanic/contracts';
import { evaluatePokerHand, POKER_HAND_VALUES, type PokerHandCategory } from '../src/index';

const c = (rank: CardRank, suit: CardSuit): Card => ({ rank, suit });

const examples: Array<{ name: string; category: PokerHandCategory; cards: Card[] }> = [
  {
    name: 'high card', category: 'high_card',
    cards: [c('2','hearts'),c('5','diamonds'),c('9','spades'),c('J','clubs'),c('K','diamonds')],
  },
  {
    name: 'pair', category: 'pair',
    cards: [c('2','hearts'),c('2','clubs'),c('5','spades'),c('8','diamonds'),c('K','hearts')],
  },
  {
    name: 'two pair', category: 'two_pair',
    cards: [c('2','hearts'),c('2','clubs'),c('8','diamonds'),c('8','spades'),c('K','hearts')],
  },
  {
    name: 'three of a kind', category: 'three_of_a_kind',
    cards: [c('4','hearts'),c('4','diamonds'),c('4','clubs'),c('7','spades'),c('K','hearts')],
  },
  {
    name: 'straight', category: 'straight',
    cards: [c('5','hearts'),c('6','diamonds'),c('7','clubs'),c('8','spades'),c('9','hearts')],
  },
  {
    name: 'flush', category: 'flush',
    cards: [c('2','hearts'),c('4','hearts'),c('7','hearts'),c('9','hearts'),c('K','hearts')],
  },
  {
    name: 'full house', category: 'full_house',
    cards: [c('4','hearts'),c('4','diamonds'),c('4','clubs'),c('9','spades'),c('9','diamonds')],
  },
  {
    name: 'four of a kind', category: 'four_of_a_kind',
    cards: [c('8','hearts'),c('8','diamonds'),c('8','clubs'),c('8','spades'),c('A','hearts')],
  },
  {
    name: 'straight flush', category: 'straight_flush',
    cards: [c('5','hearts'),c('6','hearts'),c('7','hearts'),c('8','hearts'),c('9','hearts')],
  },
  {
    name: 'royal flush', category: 'royal_flush',
    cards: [c('10','hearts'),c('J','hearts'),c('Q','hearts'),c('K','hearts'),c('A','hearts')],
  },
];

describe('evaluatePokerHand', () => {
  it.each(examples)('recognizes $name and returns the configured score', ({ category, cards }) => {
    const result = evaluatePokerHand(cards);
    expect(result.category).toBe(category);
    expect(result.label).toBe(POKER_HAND_VALUES[category].label);
    expect(result.baseChips).toBe(POKER_HAND_VALUES[category].baseChips);
    expect(result.multiplier).toBe(POKER_HAND_VALUES[category].multiplier);
    expect(result.score).toBe(result.baseChips * result.multiplier);
  });

  it('handles an ace-low wheel straight, including a wheel straight flush', () => {
    const wheel = [c('A','hearts'),c('2','diamonds'),c('3','spades'),c('4','clubs'),c('5','hearts')];
    const flushWheel = [c('A','hearts'),c('2','hearts'),c('3','hearts'),c('4','hearts'),c('5','hearts')];
    expect(evaluatePokerHand(wheel).category).toBe('straight');
    expect(evaluatePokerHand(flushWheel).category).toBe('straight_flush');
  });

  it('does not mistake a royal straight of mixed suits for a flush', () => {
    expect(evaluatePokerHand([
      c('10','hearts'),c('J','hearts'),c('Q','hearts'),c('K','hearts'),c('A','diamonds'),
    ]).category).toBe('straight');
  });

  it('does not allow A-K-Q-2-3 to wrap around or repeated ranks to form a straight', () => {
    expect(evaluatePokerHand([
      c('A','hearts'),c('K','diamonds'),c('Q','clubs'),c('2','spades'),c('3','hearts'),
    ]).category).toBe('high_card');

    expect(evaluatePokerHand([
      c('2','hearts'),c('2','diamonds'),c('3','spades'),c('4','clubs'),c('5','hearts'),
    ]).category).toBe('pair');
  });

  it('is independent of card order and never mutates the input', () => {
    const cards = examples[6]!.cards;
    const original = cards.map(card => ({ ...card }));
    const result = evaluatePokerHand(cards);
    expect(evaluatePokerHand([...cards].reverse())).toEqual(result);
    expect(cards).toEqual(original);
  });

  it('rejects incorrect hand sizes, duplicated cards and invalid runtime inputs', () => {
    const cards = examples[0]!.cards;
    expect(() => evaluatePokerHand(cards.slice(0, 4))).toThrow(RangeError);
    expect(() => evaluatePokerHand([...cards, c('A','diamonds')])).toThrow(RangeError);
    expect(() => evaluatePokerHand([cards[0]!, cards[0]!, ...cards.slice(1, 4)])).toThrow(RangeError);
    expect(() => evaluatePokerHand([...cards.slice(0, 4), { rank: '1', suit: 'hearts' } as Card]))
      .toThrow();
  });

  it('defines an exact integer score and multiplier for each category', () => {
    expect(Object.keys(POKER_HAND_VALUES)).toHaveLength(11);
    for (const rule of Object.values(POKER_HAND_VALUES)) {
      expect(Number.isSafeInteger(rule.baseChips)).toBe(true);
      expect(Number.isSafeInteger(rule.multiplier)).toBe(true);
      expect(rule.baseChips).toBeGreaterThan(0);
      expect(rule.multiplier).toBeGreaterThan(0);
    }
  });
});
