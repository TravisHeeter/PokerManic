import { describe, expect, it } from 'vitest';
import type { Card, CardRank, CardSuit } from '@pokermanic/contracts';
import {
  DEFAULT_ROUND_RULES, advanceRound, applyPurchasedRuleUpgrade, createStandardDeck, discardCards, getRoundDiscards,
  getRoundHands, getRoundTarget, listEligiblePokerHands, playScoringHand, startRun,
  type RoundRules, type RunState,
} from '../src/index';

const c = (rank: CardRank, suit: CardSuit): Card => ({ rank, suit });
const firstFive = [0, 1, 2, 3, 4];

const fixture = (): RunState => {
  const chosen = [
    c('K', 'spades'), c('Q', 'hearts'), c('J', 'clubs'), c('10', 'diamonds'), c('9', 'spades'),
    c('2', 'diamonds'), c('4', 'clubs'), c('7', 'hearts'),
  ];
  const chosenIds = new Set(chosen.map((card) => `${card.suit}:${card.rank}`));
  return {
    ...startRun(DEFAULT_ROUND_RULES, () => 0.5),
    hand: chosen,
    drawPile: createStandardDeck().filter((card) => !chosenIds.has(`${card.suit}:${card.rank}`)),
  };
};

describe('Milestone 4 round rules', () => {
  it('starts a deterministic run with eight unique cards, 44 to draw and configured limits', () => {
    const run = startRun(DEFAULT_ROUND_RULES, () => 0.5);
    expect(run).toMatchObject({
      phase: 'playing', round: 1, roundChips: 0, totalChips: 0,
      handsRemaining: 4, discardsRemaining: 3, roundTarget: 60,
    });
    expect(run.hand).toHaveLength(8);
    expect(run.drawPile).toHaveLength(44);
    expect(new Set([...run.hand, ...run.drawPile].map((card) => `${card.suit}:${card.rank}`)).size).toBe(52);
    expect(startRun(DEFAULT_ROUND_RULES, () => 0.5)).toEqual(run);
  });

  it('has increasing targets and allows longer rounds, without a maximum round number', () => {
    expect([1, 2, 3, 4].map((round) => getRoundTarget(round))).toEqual([60, 115, 200, 315]);
    expect(getRoundHands(1)).toBe(4);
    expect(getRoundHands(5)).toBe(5);
    expect(getRoundHands(9)).toBe(6);
    expect(getRoundDiscards(7)).toBe(4);
    expect(getRoundTarget(100)).toBeGreaterThan(getRoundTarget(10));
    expect(() => getRoundTarget(0)).toThrow(RangeError);
  });

  it('plays five cards, scores only the eligible category, removes all played cards and refills', () => {
    const state = fixture();
    const before = structuredClone(state);
    const played = playScoringHand(state, firstFive);
    expect(played).toMatchObject({
      phase: 'round_won', roundChips: 120, totalChips: 120, handsRemaining: 3, handsPlayed: 1,
    });
    expect(played.lastScored?.category).toBe('straight');
    expect(played.playedCards).toEqual(state.hand.slice(0, 5));
    expect(played.hand.slice(0, 3)).toEqual(state.hand.slice(5));
    expect(played.hand).toHaveLength(8);
    expect(played.drawPile).toHaveLength(39);
    expect(state).toEqual(before);
    expect(new Set([...played.hand,...played.drawPile,...played.playedCards]
      .map((card) => `${card.suit}:${card.rank}`)).size).toBe(52);
  });

  it('allows lower-ranked high card only when manual selection is unlocked and active', () => {
    const state = fixture();
    const options = listEligiblePokerHands(state.hand.slice(0, 5));
    const jack = options.find((option) => option.category === 'high_card'
      && option.scoringCardIndices[0] === 2)!;
    const auto = playScoringHand(state, firstFive,
      { manualSelectionUnlocked: false, selectionMode: 'manual' }, jack.id);
    expect(auto.lastScored?.category).toBe('straight');
    const manual = playScoringHand(state, firstFive,
      { manualSelectionUnlocked: true, selectionMode: 'manual' }, jack.id);
    expect(manual.lastScored).toMatchObject({ category: 'high_card', scoringCardIndices: [2], score: 5 });
    expect(manual.phase).toBe('playing');
    expect(playScoringHand(state, firstFive,
      { manualSelectionUnlocked: true, selectionMode: 'automatic' }, jack.id).lastScored?.category)
      .toBe('straight');
    expect(() => playScoringHand(state, firstFive,
      { manualSelectionUnlocked: true, selectionMode: 'manual' }, 'fake-option')).toThrow(RangeError);
  });

  it('discards selected cards, refills and consumes one discard action', () => {
    const state = fixture();
    const discarded = discardCards(state, [0,2,4]);
    expect(discarded.discardsRemaining).toBe(2);
    expect(discarded.handsRemaining).toBe(4);
    expect(discarded.roundChips).toBe(0);
    expect(discarded.hand).toHaveLength(8);
    expect(discarded.drawPile).toHaveLength(41);
    expect(discarded.discardedCards).toEqual([state.hand[0],state.hand[2],state.hand[4]]);
    expect(state.discardsRemaining).toBe(3);
    expect(() => discardCards(state, [])).toThrow(RangeError);
    expect(() => discardCards(state, [0,1,2,3,4,5])).toThrow(RangeError);
    expect(() => discardCards(state, [0,0])).toThrow(RangeError);
    expect(() => discardCards({...state, discardsRemaining:0}, [0])).toThrow();
    expect(discardCards({...state, drawPile:[], playedCards: [c('2', 'spades')]}, [0],
      DEFAULT_ROUND_RULES, () => 0.5).hand).toHaveLength(8);
  });

  it('advances only a won round and keeps lifetime chip totals', () => {
    const won = playScoringHand(fixture(), firstFive);
    const next = advanceRound(won, DEFAULT_ROUND_RULES, () => 0.25);
    expect(next).toMatchObject({
      phase: 'playing', round: 2, roundTarget: 115, roundChips: 0, totalChips: 120,
      handsRemaining: 4, discardsRemaining: 3, handsPlayed: 0, lastScored: null,
    });
    expect(next.hand).toHaveLength(8);
    expect(next.drawPile).toHaveLength(44);
    expect(next.playedCards).toHaveLength(0);
    expect(() => advanceRound(fixture())).toThrow();
  });

  it('ends the run when hands are exhausted without reaching the target', () => {
    const state = { ...fixture(), handsRemaining: 1, roundTarget: 500 };
    const lost = playScoringHand(state, firstFive, {
      manualSelectionUnlocked: false, selectionMode: 'automatic',
    });
    expect(lost.phase).toBe('game_over');
    expect(lost.handsRemaining).toBe(0);
    expect(() => playScoringHand(lost, firstFive)).toThrow();
    expect(() => discardCards(lost, [0])).toThrow();
    expect(() => advanceRound(lost)).toThrow();
  });


  it('allows any count from one to six with a six-card maximum', () => {
    const rules: RoundRules = { ...DEFAULT_ROUND_RULES, cardsPerPlay: 6, baseChipTarget: 9999 };
    const state = fixture();
    const one = playScoringHand(state, [2], undefined, undefined, rules, () => 0.5);
    expect(one.lastScored).toMatchObject({ category: 'high_card', scoringCardIndices: [0] });
    expect(one.playedCards).toEqual([state.hand[2]]);
    expect(one.hand).toHaveLength(8);
    expect(one.drawPile).toHaveLength(43);
    expect(one.handsRemaining).toBe(state.handsRemaining - 1);
    const two = playScoringHand(state, [0,2], undefined, undefined, rules, () => 0.5);
    expect(two.lastScored?.category).toBe('high_card');
    expect(two.playedCards).toHaveLength(2);
    const three = playScoringHand(state, [0,2,5], undefined, undefined, rules, () => 0.5);
    expect(three.lastScored?.category).toBe('high_card');
    expect(three.playedCards).toHaveLength(3);
    const four = playScoringHand(state, [0,1,2,5], undefined, undefined, rules, () => 0.5);
    expect(four.lastScored?.category).toBe('high_card');
    expect(four.playedCards).toHaveLength(4);
    const five = playScoringHand(state, [0,1,2,3,4], undefined, undefined, rules, () => 0.5);
    expect(five.lastScored?.category).toBe('straight');
    expect(five.playedCards).toHaveLength(5);
    const six = playScoringHand(state, [0,1,2,3,4,5], undefined, undefined, rules, () => 0.5);
    expect(six.lastScored?.category).toBe('straight');
    expect(six.playedCards).toHaveLength(6);
    expect(six.hand).toHaveLength(8);
    expect(six.drawPile).toHaveLength(38);
    expect(six.handsRemaining).toBe(state.handsRemaining - 1);
    expect(() => playScoringHand(state, [], undefined, undefined, rules)).toThrow(RangeError);
    expect(() => playScoringHand(state, [0,1,2,3,4,5,6], undefined, undefined, rules)).toThrow(RangeError);
  });

  it('supports manual choice of a lower High Card when playing fewer than five cards', () => {
    const state = fixture();
    const cards = [state.hand[0]!, state.hand[2]!]; // King and Jack
    const jack = listEligiblePokerHands(cards).find(option =>
      option.category === 'high_card' && option.scoringCardIndices[0] === 1);
    expect(jack).toBeDefined();
    const scored = playScoringHand(state, [0,2],
      { manualSelectionUnlocked: true, selectionMode: 'manual' },
      jack!.id, DEFAULT_ROUND_RULES, () => 0.5);
    expect(scored.lastScored?.scoringCardIndices).toEqual([1]);
    expect(scored.playedCards).toEqual(cards);
    expect(scored.roundChips).toBe(5);
  });

  it('supports full six-card scoring patterns when all six contribute', () => {
    const rules: RoundRules = { ...DEFAULT_ROUND_RULES, cardsPerPlay: 6, baseChipTarget: 9999 };
    const state = fixture();
    const sixCards = [
      c('A','hearts'), c('A','clubs'), c('K','hearts'), c('K','clubs'),
      c('Q','diamonds'), c('Q','spades'),
    ];
    const ids = new Set(sixCards.map(card => `${card.rank}:${card.suit}`));
    const all = [...sixCards, ...createStandardDeck().filter(card => !ids.has(`${card.rank}:${card.suit}`))];
    const prepared = { ...state, hand: all.slice(0,8), drawPile: all.slice(8) };
    const six = playScoringHand(prepared, [0,1,2,3,4,5], undefined, undefined, rules, () => 0.5);
    expect(six.lastScored?.category).toBe('three_pair');
    expect(six.lastScored?.scoringCardIndices).toHaveLength(6);
    expect(six.playedCards).toHaveLength(6);
  });

  it('accepts future hand/discard upgrades through rules without changing the engine', () => {
    const rules: RoundRules = {
      ...DEFAULT_ROUND_RULES, handSize: 10, cardsPerPlay: 6, maxCardsPerDiscard: 8,
      baseHandsPerRound: 6, baseDiscardsPerRound: 4, baseChipTarget: 200,
    };
    const state = startRun(rules, () => 0.5);
    expect(state.hand).toHaveLength(10);
    expect(state.drawPile).toHaveLength(42);
    expect(state.handsRemaining).toBe(6);
    expect(state.discardsRemaining).toBe(4);
    expect(state.roundTarget).toBe(200);
    expect(discardCards(state,[0,1,2,3,4,5,6,7],rules).hand).toHaveLength(10);
    expect(() => startRun({...rules,cardsPerPlay:9})).toThrow(RangeError);
    expect(() => startRun({...rules,maxCardsPerDiscard:11})).toThrow(RangeError);
  });
});

describe('draw pile recycling', () => {
  it('recycles the played and discarded piles so long rounds can use more than 52 draws', () => {
    const rules: RoundRules = {
      ...DEFAULT_ROUND_RULES, baseHandsPerRound: 16, baseChipTarget: 999999,
    };
    let state = startRun(rules, () => 0.5);
    for (let i = 0; i < 11; i++) {
      state = playScoringHand(state, firstFive, undefined, undefined, rules, () => 0.5);
      expect(state.phase).toBe('playing');
      expect(state.hand).toHaveLength(8);
      expect([...state.hand, ...state.drawPile, ...state.playedCards, ...state.discardedCards])
        .toHaveLength(52);
      expect(new Set([...state.hand,...state.drawPile,...state.playedCards,...state.discardedCards]
        .map((card) => `${card.suit}:${card.rank}`)).size).toBe(52);
    }
    expect(state.handsRemaining).toBe(5);
    expect(state.roundChips).toBeGreaterThan(0);
  });
});


describe('Milestone 5 immediate purchase effects', () => {
  it('draws one extra card immediately, preserves selections and all cards exactly once', () => {
    const original = fixture();
    const nextRules = { ...DEFAULT_ROUND_RULES, handSize: 9 };
    const before = structuredClone(original);
    const updated = applyPurchasedRuleUpgrade(original, DEFAULT_ROUND_RULES, nextRules, () => 0.5);
    expect(updated.hand).toHaveLength(9);
    expect(updated.hand.slice(0,8)).toEqual(original.hand);
    expect(updated.hand[8]).toEqual(original.drawPile[0]);
    expect(updated.drawPile).toHaveLength(43);
    expect(updated.handsRemaining).toBe(original.handsRemaining);
    expect(updated.discardsRemaining).toBe(original.discardsRemaining);
    expect(updated.roundChips).toBe(original.roundChips);
    expect(updated.roundTarget).toBe(original.roundTarget);
    expect(original).toEqual(before);
    const ids = [...updated.hand,...updated.drawPile,...updated.playedCards,...updated.discardedCards]
      .map(card => `${card.rank}:${card.suit}`);
    expect(ids).toHaveLength(52);
    expect(new Set(ids).size).toBe(52);
    // The extra held card is usable in the same round.
    const selectedExtra = playScoringHand(updated, [8], undefined, undefined, nextRules, () => 0.5);
    expect(selectedExtra.playedCards).toHaveLength(1);
    expect(selectedExtra.hand).toHaveLength(9);
  });

  it('immediately increases scoring hands and discard actions, without resetting spent actions', () => {
    const original = { ...fixture(), handsRemaining: 1, discardsRemaining: 0, roundChips: 35 };
    const upgradedRules = {
      ...DEFAULT_ROUND_RULES, baseHandsPerRound: 5, baseDiscardsPerRound: 4,
      cardsPerPlay: 6, maxCardsPerDiscard: 6,
    };
    const updated = applyPurchasedRuleUpgrade(original, DEFAULT_ROUND_RULES, upgradedRules);
    expect(updated.handsRemaining).toBe(2);
    expect(updated.discardsRemaining).toBe(1);
    expect(updated.roundChips).toBe(35);
    expect(updated.hand).toEqual(original.hand);
    expect(discardCards(updated,[0,1,2,3,4,5],upgradedRules).discardsRemaining).toBe(0);
    expect(playScoringHand(updated,[0,1,2,3,4,5],undefined,undefined,upgradedRules).handsRemaining).toBe(1);
  });

  it('supports repeated held-card purchases and recycling when the draw pile is empty', () => {
    const original = fixture();
    const firstRules = {...DEFAULT_ROUND_RULES, handSize:9 };
    const secondRules = {...DEFAULT_ROUND_RULES, handSize:10 };
    const first = applyPurchasedRuleUpgrade(original, DEFAULT_ROUND_RULES, firstRules, () => 0.5);
    const second = applyPurchasedRuleUpgrade(first, firstRules, secondRules, () => 0.5);
    expect(second.hand).toHaveLength(10);
    expect(second.drawPile).toHaveLength(42);
    expect(second.hand.slice(0,8)).toEqual(original.hand);
    const exhausted = {
      ...original,
      drawPile: [],
      playedCards: [original.drawPile[0]!, original.drawPile[1]!],
      discardedCards: [],
    };
    const recycled = applyPurchasedRuleUpgrade(exhausted,DEFAULT_ROUND_RULES,firstRules,()=>0.5);
    expect(recycled.hand).toHaveLength(9);
    expect(recycled.playedCards).toHaveLength(0);
    expect(recycled.drawPile).toHaveLength(1);
    expect(recycled.hand[8]).toEqual(exhausted.playedCards[0]);
  });

  it('rejects purchases after defeat and invalid rule changes', () => {
    const state = fixture();
    expect(() => applyPurchasedRuleUpgrade({...state,phase:'game_over'},
      DEFAULT_ROUND_RULES,{...DEFAULT_ROUND_RULES,handSize:9})).toThrow();
    expect(() => applyPurchasedRuleUpgrade(state,DEFAULT_ROUND_RULES,
      {...DEFAULT_ROUND_RULES,handSize:7})).toThrow(RangeError);
    expect(() => applyPurchasedRuleUpgrade(state,DEFAULT_ROUND_RULES,
      {...DEFAULT_ROUND_RULES,baseChipTarget:100})).toThrow(RangeError);
    expect(() => applyPurchasedRuleUpgrade(state,DEFAULT_ROUND_RULES,
      {...DEFAULT_ROUND_RULES,handSize:9},()=>0.5).hand).toHaveLength(9);
  });
});
