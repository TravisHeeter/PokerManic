import { describe, expect, it } from 'vitest';
import { createStandardDeck } from '../src/deck.js';
import { startRun, advanceRound, playScoringHand, discardCards, DEFAULT_ROUND_RULES } from '../src/rounds.js';
import { createRunProgress } from '../src/progression.js';
import { applyCardModifiers, cardIdentity, purchaseCardModifier } from '../src/modifiers.js';
import { listEligiblePokerHands } from '../src/choices.js';

describe('Milestone 8 card modifiers', () => {
  it('purchases once per real card using run upgrade chips, and blocks invalid purchases', () => {
    const run = startRun(undefined, () => 0.5);
    const progress = { ...createRunProgress(), upgradeChips: 300 };
    const card = run.hand[0]!;
    const result = purchaseCardModifier(run, progress, 0, 'bonus');
    expect(result.progress.upgradeChips).toBe(200);
    expect(result.run.cardModifiers?.[cardIdentity(card)]).toBe('bonus');
    expect(run.cardModifiers).toEqual({});
    expect(progress.upgradeChips).toBe(300);
    expect(() => purchaseCardModifier(result.run, result.progress, 0, 'multiplier')).toThrow('already');
    expect(() => purchaseCardModifier(run, progress, -1, 'bonus')).toThrow(RangeError);
    expect(() => purchaseCardModifier(run, createRunProgress(), 0, 'bonus')).toThrow('Not enough');
    expect(() => purchaseCardModifier({ ...run, phase: 'game_over' }, progress, 0, 'bonus')).toThrow('active');
  });

  it('counts only contributing cards and counts overlap just once', () => {
    const cards = [
      { suit: 'clubs' as const, rank: '10' as const },
      { suit: 'clubs' as const, rank: '8' as const },
      { suit: 'clubs' as const, rank: '4' as const },
      { suit: 'clubs' as const, rank: '3' as const },
      { suit: 'clubs' as const, rank: '2' as const },
      { suit: 'hearts' as const, rank: '4' as const },
    ];
    const option = listEligiblePokerHands(cards).find(x => x.category === 'combination' &&
      x.combinationType === 'overlapping' && x.score === 270)!;
    expect(option).toBeDefined();
    const updated = applyCardModifiers(option, cards, {
      'clubs:4': 'bonus', 'clubs:10': 'multiplier',
    });
    expect(updated.modifierBonusChips).toBe(10);
    expect(updated.modifierMultiplier).toBe(1.5);
    expect(updated.score).toBe(Math.round((270 + 10 * option.multiplier) * 1.5));
    const highCard = listEligiblePokerHands(cards).find(x =>
      x.category === 'high_card' && x.scoringCardIndices[0] === 1)!;
    expect(applyCardModifiers(highCard, cards, { 'clubs:4': 'bonus' }).score).toBe(5);
  });

  it('retains card effects through actual scoring, discards, and round changes', () => {
    let run = startRun(undefined, () => 0.5);
    const progress = { ...createRunProgress(), upgradeChips: 500 };
    const selected = run.hand[0]!;
    const purchased = purchaseCardModifier(run, progress, 0, 'bonus');
    run = purchased.run;
    const played = playScoringHand(run, [0], undefined, undefined, DEFAULT_ROUND_RULES, () => 0.5);
    expect(played.lastScored?.score).toBe(15);
    expect(played.cardModifiers?.[cardIdentity(selected)]).toBe('bonus');
    const discarded = discardCards(run, [0], DEFAULT_ROUND_RULES, () => 0.5);
    expect(discarded.cardModifiers?.[cardIdentity(selected)]).toBe('bonus');
    const won = { ...played, phase: 'round_won' as const };
    const next = advanceRound(won, DEFAULT_ROUND_RULES, () => 0.5);
    expect(next.cardModifiers?.[cardIdentity(selected)]).toBe('bonus');
    expect(startRun().cardModifiers).toEqual({});
  });

  it('multiplies actual hand score by 1.5 without changing base poker classification', () => {
    const run = startRun(undefined, () => 0.5);
    const progress = { ...createRunProgress(), upgradeChips: 200 };
    const updated = purchaseCardModifier(run, progress, 0, 'multiplier').run;
    const result = playScoringHand(updated, [0]);
    expect(result.lastScored?.category).toBe('high_card');
    expect(result.lastScored?.score).toBe(8);
    expect(result.lastScored?.modifierMultiplier).toBe(1.5);
  });
});
