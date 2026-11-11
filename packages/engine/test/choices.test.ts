import { describe, expect, it } from 'vitest';
import type { Card, CardRank, CardSuit } from '@pokermanic/contracts';
import { listEligiblePokerHands, resolveScoringOption } from '../src/index';

const c = (rank: CardRank, suit: CardSuit): Card => ({ rank, suit });

describe('manual choice foundation', () => {
  it('offers every individual high card in a straight, including Jack', () => {
    const cards = [c('K','spades'),c('Q','hearts'),c('J','clubs'),c('10','diamonds'),c('9','spades')];
    const options = listEligiblePokerHands(cards);
    expect(options[0]?.category).toBe('straight');
    expect(options.filter((o) => o.category === 'high_card')).toHaveLength(5);
    const jack = options.find((o) => o.category === 'high_card' && o.scoringCardIndices[0] === 2);
    expect(jack).toMatchObject({ category: 'high_card', scoringCardIndices: [2] });
    expect(resolveScoringOption(options, { manualSelectionUnlocked: true, selectionMode: 'manual' }, jack!.id))
      .toEqual(jack);
    expect(resolveScoringOption(options, { manualSelectionUnlocked: false, selectionMode: 'manual' }, jack!.id)?.category)
      .toBe('straight');
    expect(resolveScoringOption(options, { manualSelectionUnlocked: true, selectionMode: 'automatic' }, jack!.id)?.category)
      .toBe('straight');
  });

  it('can select either of two separate four-of-a-kinds inside an eight-card full house', () => {
    const cards = ['hearts','diamonds','clubs','spades'].flatMap((suit) => [
      c('A', suit as CardSuit), c('K', suit as CardSuit),
    ]);
    const options = listEligiblePokerHands(cards);
    expect(options.some((o) => o.category === 'full_house' && o.scoringCardIndices.length === 8)).toBe(true);
    const quads = options.filter((o) => o.category === 'four_of_a_kind');
    expect(quads).toHaveLength(2);
    expect(quads.map((o) => o.scoringCardIndices.map((i) => cards[i]!.rank).join('')))
      .toEqual(['AAAA', 'KKKK']);
    const selected = resolveScoringOption(options, { manualSelectionUnlocked: true, selectionMode: 'manual' }, quads[1]!.id);
    expect(selected?.scoringCardIndices).toEqual(quads[1]!.scoringCardIndices);
  });

  it('recognizes three-pair and four-pair patterns from six and eight cards', () => {
    const cards = [c('A','hearts'),c('A','clubs'),c('K','hearts'),c('K','clubs'),
      c('Q','diamonds'),c('Q','spades'),c('J','diamonds'),c('J','spades')];
    expect(listEligiblePokerHands(cards.slice(0, 6)).some((o) =>
      o.category === 'three_pair' && o.scoringCardIndices.length === 6)).toBe(true);
    expect(listEligiblePokerHands(cards).some((o) =>
      o.category === 'four_pair' && o.scoringCardIndices.length === 8)).toBe(true);
  });

  it('recognizes extended flushes, straights and straight flushes up to eight cards', () => {
    const hearts = [c('2','hearts'),c('3','hearts'),c('4','hearts'),c('5','hearts'),
      c('6','hearts'),c('7','hearts'),c('8','hearts'),c('9','hearts')];
    const eight = listEligiblePokerHands(hearts);
    expect(eight.some((o) => o.category === 'flush' && o.scoringCardIndices.length === 8)).toBe(true);
    expect(eight.some((o) => o.category === 'straight' && o.scoringCardIndices.length === 8)).toBe(true);
    expect(eight.some((o) => o.category === 'straight_flush' && o.scoringCardIndices.length === 8)).toBe(true);
    expect(eight.some((o) => o.category === 'straight_flush' && o.scoringCardIndices.length === 7)).toBe(true);
  });

  it('allows straight, flush, straight flush and high card for royal flush cards', () => {
    const cards = [c('10','hearts'),c('J','hearts'),c('Q','hearts'),c('K','hearts'),c('A','hearts')];
    const categories = new Set(listEligiblePokerHands(cards).map((o) => o.category));
    expect(categories).toEqual(new Set(['high_card','straight','flush','straight_flush','royal_flush']));
  });

  it('chooses the higher card automatically among high cards', () => {
    const cards = [c('K','spades'),c('J','hearts')];
    const options = listEligiblePokerHands(cards);
    expect(options[0]?.scoringCardIndices).toEqual([0]);
    expect(resolveScoringOption(options, { manualSelectionUnlocked: true, selectionMode: 'automatic' })?.scoringCardIndices)
      .toEqual([0]);
    expect(resolveScoringOption([], { manualSelectionUnlocked: false, selectionMode: 'automatic' })).toBeNull();
  });

  it('validates duplicate cards, size and card schema and leaves caller data unchanged', () => {
    const cards = [c('A','spades'),c('K','hearts'),c('Q','diamonds')];
    const original = structuredClone(cards);
    listEligiblePokerHands(cards);
    expect(cards).toEqual(original);
    expect(() => listEligiblePokerHands([cards[0]!, cards[0]!])).toThrow(RangeError);
    expect(() => listEligiblePokerHands(Array(9).fill(cards[0]!))).toThrow(RangeError);
    expect(() => listEligiblePokerHands([{ suit: 'spades', rank: 'X' } as Card])).toThrow();
  });
});
