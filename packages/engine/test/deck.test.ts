import { describe, expect, it } from 'vitest';
import { CARD_RANKS, CARD_SUITS } from '@pokermanic/contracts';
import { createStandardDeck, dealCards, shuffleDeck } from '../src/index';

describe('createStandardDeck', () => {
  it('creates one of each of the 52 rank/suit combinations', () => {
    const deck = createStandardDeck();

    expect(deck).toHaveLength(52);
    expect(new Set(deck.map(({ rank, suit }) => `${suit}:${rank}`)).size).toBe(52);
    for (const suit of CARD_SUITS) {
      expect(deck.filter((card) => card.suit === suit).map((card) => card.rank))
        .toEqual([...CARD_RANKS]);
    }
  });

  it('returns a fresh deck each time', () => {
    const first = createStandardDeck();
    const second = createStandardDeck();
    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    expect(first[0]).not.toBe(second[0]);
  });
});

describe('shuffleDeck', () => {
  it('uses the injected random function and does not mutate input', () => {
    const deck = createStandardDeck().slice(0, 4);
    const original = deck.map((card) => ({ ...card }));

    expect(shuffleDeck(deck, () => 0)).toEqual([
      deck[1], deck[2], deck[3], deck[0],
    ]);
    expect(deck).toEqual(original);
  });

  it('preserves every card and returns a fresh array', () => {
    const deck = createStandardDeck();
    const shuffled = shuffleDeck(deck, () => 0.5);

    expect(shuffled).not.toBe(deck);
    expect(shuffled).toHaveLength(52);
    expect(new Set(shuffled.map(({ rank, suit }) => `${suit}:${rank}`)).size)
      .toBe(52);
    expect(shuffled).not.toEqual(deck);
  });

  it('rejects random values outside the expected range', () => {
    const deck = createStandardDeck();
    for (const invalid of [-0.1, 1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => shuffleDeck(deck, () => invalid)).toThrow(RangeError);
    }
  });

  it('handles empty and one-card decks', () => {
    const deck = createStandardDeck();
    expect(shuffleDeck([])).toEqual([]);
    expect(shuffleDeck(deck.slice(0, 1))).toEqual(deck.slice(0, 1));
  });
});

describe('dealCards', () => {
  it('deals the requested hand from the top, preserving order', () => {
    const deck = createStandardDeck();
    const { hand, remainingDeck } = dealCards(deck, 8);

    expect(hand).toEqual(deck.slice(0, 8));
    expect(remainingDeck).toEqual(deck.slice(8));
    expect([...hand, ...remainingDeck]).toEqual(deck);
    expect(deck).toHaveLength(52);
  });

  it('supports dealing zero or all cards', () => {
    const deck = createStandardDeck();
    expect(dealCards(deck, 0)).toEqual({ hand: [], remainingDeck: deck });
    expect(dealCards(deck, deck.length))
      .toEqual({ hand: deck, remainingDeck: [] });
  });

  it('rejects fractional, negative, and excessive deal counts', () => {
    const deck = createStandardDeck();
    for (const count of [-1, 1.5, 53, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => dealCards(deck, count)).toThrow(RangeError);
    }
  });
});
