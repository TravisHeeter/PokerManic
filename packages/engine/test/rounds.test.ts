import { describe, expect, it } from 'vitest';
import type { Card, CardRank, CardSuit } from '@pokermanic/contracts';
import {
  DEFAULT_ROUND_RULES, advanceRound, createStandardDeck, discardCards, getRoundDiscards,
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
    expect(() => discardCards({...state, drawPile:[]}, [0])).toThrow();
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
