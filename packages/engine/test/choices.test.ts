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


  it('awards more chips for longer straights, flushes and straight flushes', () => {
    const cards = [
      c('2','hearts'),c('3','hearts'),c('4','hearts'),c('5','hearts'),
      c('6','hearts'),c('7','hearts'),c('8','hearts'),c('9','hearts'),
    ];
    for (const category of ['straight','flush','straight_flush'] as const) {
      const expectedBase = category === 'straight' ? 30 : category === 'flush' ? 35 : 100;
      const multiplier = category === 'straight_flush' ? 8 : 4;
      const amounts = [5,6,7,8].map(count => {
        const option = listEligiblePokerHands(cards.slice(0,count))
          .find(o => o.category === category && o.scoringCardIndices.length === count);
        expect(option).toBeDefined();
        expect(option!.baseChips).toBe(Math.round(expectedBase * (1 + 0.25 * (count - 5))));
        expect(option!.score).toBe(option!.baseChips * multiplier);
        return option!.score;
      });
      expect(amounts[0]).toBeLessThan(amounts[1]!);
      expect(amounts[1]).toBeLessThan(amounts[2]!);
      expect(amounts[2]).toBeLessThan(amounts[3]!);
    }
  });

  it('awards bigger full houses for six, seven, and eight scoring cards', () => {
    const cards = [
      c('A','spades'), c('A','hearts'),c('A','diamonds'),c('A','clubs'),
      c('K','spades'),c('K','hearts'),c('K','diamonds'),c('K','clubs'),
    ];
    const combinations = [
      [0,1,2,4,5],             // 3 + 2
      [0,1,2,4,5,6],           // 3 + 3
      [0,1,2,3,4,5,6],         // 4 + 3
      [0,1,2,3,4,5,6,7],       // 4 + 4
    ];
    const expected = [40,50,60,70];
    combinations.forEach((indices,i) => {
      const option = listEligiblePokerHands(indices.map(n=>cards[n]!))
        .find(o=>o.category==='full_house' && o.scoringCardIndices.length === indices.length);
      expect(option?.baseChips).toBe(expected[i]);
      expect(option?.score).toBe(expected[i]! * 4);
    });
  });

  it('only rewards the qualifying scoring subset, not extra unscored committed cards', () => {
    const cards = [
      c('2','hearts'),c('3','diamonds'),c('4','spades'),c('5','clubs'),c('6','hearts'),c('K','clubs')
    ];
    const options = listEligiblePokerHands(cards);
    const straight = options.find(o=>o.category==='straight' && o.scoringCardIndices.length===5);
    expect(straight?.baseChips).toBe(30);
    expect(straight?.score).toBe(120);
    expect(options.some(o=>o.category==='straight' && o.scoringCardIndices.length===6)).toBe(false);
  });


  it('adds separate Flush + Pair scores for seven unique contributing cards', () => {
    const cards = [
      c('10','clubs'), c('8','clubs'), c('4','clubs'), c('3','clubs'), c('2','clubs'),
      c('4','spades'), c('4','hearts'),
    ];
    const combos = listEligiblePokerHands(cards).filter(option=>option.category==='combination');
    const combo = combos.find(option => option.combinationType === 'separate'
      && new Set(option.components?.map(component => component.category)).size === 2
      && option.components?.some(component => component.category==='flush')
      && option.components?.some(component => component.category==='pair'));
    // Note: three fours are available here, but one is inside the Flush.
    // The two off-suit fours are a disjoint pair.
    expect(combo).toBeDefined();
    expect(combo!.score).toBe((35*4)+(10*2));
    expect(combo!.scoringCardIndices).toEqual([0,1,2,3,4,5,6]);
    expect(combo!.components?.map(component=>component.score).reduce((a,b)=>a+b,0)).toBe(160);
  });

  it('combines shared Flush and Pair chips before multiplying', () => {
    const cards = [
      c('10','clubs'),c('8','clubs'),c('4','clubs'),c('3','clubs'),c('2','clubs'),
      c('4','hearts'),
    ];
    const option = listEligiblePokerHands(cards).find(option => option.category==='combination'
      && option.combinationType==='overlapping'
      && option.components?.some(component=>component.category==='flush')
      && option.components?.some(component=>component.category==='pair'));
    expect(option).toBeDefined();
    expect(option?.baseChips).toBe(45);
    expect(option?.multiplier).toBe(6);
    expect(option?.score).toBe(270);
    expect(option?.scoringCardIndices).toEqual([0,1,2,3,4,5]);
    expect(resolveScoringOption(listEligiblePokerHands(cards),
      {manualSelectionUnlocked:false,selectionMode:'automatic'})?.score).toBe(270);
  });

  it('does not double-count a formation completely contained within another', () => {
    const cards=[c('2','hearts'),c('3','hearts'),c('4','hearts'),c('5','hearts'),c('6','hearts')];
    const options=listEligiblePokerHands(cards);
    expect(options.some(option=>option.category==='combination')).toBe(false);
    expect(options[0]?.category).toBe('straight_flush');
  });

  it('supports choosing between disjoint and overlapping formations in manual mode', () => {
    const cards=[
      c('10','clubs'),c('8','clubs'),c('4','clubs'),c('3','clubs'),c('2','clubs'),
      c('4','spades'),c('4','hearts'),
    ];
    const choices=listEligiblePokerHands(cards);
    const overlap=choices.find(option=>option.category==='combination'
      && option.combinationType==='overlapping'
      && option.components?.some(component=>component.category==='flush')
      && option.components?.some(component=>component.category==='pair'));
    const separate=choices.find(option=>option.category==='combination'
      && option.combinationType==='separate'
      && option.components?.some(component=>component.category==='flush')
      && option.components?.some(component=>component.category==='pair'));
    expect(overlap).toBeDefined();
    expect(separate).toBeDefined();
    const selected=resolveScoringOption(choices,{manualSelectionUnlocked:true,selectionMode:'manual'},separate!.id);
    expect(selected?.score).toBe(160);
    expect(resolveScoringOption(choices,{manualSelectionUnlocked:true,selectionMode:'manual'},overlap!.id)?.score)
      .toBe(270);
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
