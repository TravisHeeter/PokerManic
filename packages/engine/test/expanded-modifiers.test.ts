import { describe, expect, it } from 'vitest';
import type { Card } from '@pokermanic/contracts';
import { listEligiblePokerHands } from '../src/choices.js';
import { startRun, playScoringHand, advanceRound, DEFAULT_ROUND_RULES } from '../src/rounds.js';
import { createRunProgress } from '../src/progression.js';
import { applyCardModifiers, goldCardReward, purchaseCardModifier } from '../src/modifiers.js';

const card = (rank: Card['rank'], suit: Card['suit']): Card => ({ rank, suit });
const has = (cards: Card[], category: string, modifiers: Record<string, any>) =>
  listEligiblePokerHands(cards, modifiers).some(option => option.category === category && option.scoringCardIndices.length === cards.length);

describe('Milestone 9 wild-card patterns', () => {
  it('suit wild preserves rank and can complete a flush, but not an incorrect straight', () => {
    const cards = [card('2','spades'),card('4','spades'),card('6','spades'),card('8','spades'),card('10','hearts')];
    expect(has(cards,'flush',{'hearts:10':'wild_suit'})).toBe(true);
    expect(has(cards,'straight',{'hearts:10':'wild_suit'})).toBe(false);
    expect(has(cards,'flush',{'hearts:10':'wild_rank'})).toBe(false);
  });

  it('rank wild preserves suit and fills straight and five-of-a-kind patterns', () => {
    const straight = [card('10','spades'),card('J','hearts'),card('Q','clubs'),card('K','diamonds'),card('2','spades')];
    expect(has(straight,'straight',{'spades:2':'wild_rank'})).toBe(true);
    expect(has(straight,'royal_flush',{'spades:2':'wild_rank'})).toBe(false);
    const quads = [card('A','spades'),card('A','hearts'),card('A','diamonds'),card('A','clubs'),card('2','spades')];
    expect(has(quads,'five_of_a_kind',{'spades:2':'wild_rank'})).toBe(true);
  });

  it('full wild changes rank AND suit to complete a royal flush', () => {
    const cards = [card('10','clubs'),card('J','clubs'),card('Q','clubs'),card('K','clubs'),card('2','spades')];
    expect(has(cards,'royal_flush',{'spades:2':'wild_full'})).toBe(true);
    expect(has(cards,'royal_flush',{'spades:2':'wild_rank'})).toBe(false);
    expect(has(cards,'royal_flush',{'spades:2':'wild_suit'})).toBe(false);
    const royal = listEligiblePokerHands(cards,{'spades:2':'wild_full'}).find(x=>x.category==='royal_flush');
    expect(royal?.wildAssignments).toContainEqual({index:4, rank:'A', suit:'clubs'});
  });

  it('does not produce impossible overlapping wild interpretations', () => {
    const cards = [card('2','hearts'),card('3','hearts'),card('4','hearts'),card('5','hearts'),card('9','clubs'),card('9','diamonds')];
    const options = listEligiblePokerHands(cards,{'clubs:9':'wild_full'});
    for (const option of options.filter(x=>x.category==='combination')) {
      const assignments = option.components?.flatMap(component=>component.wildAssignments ?? []) ?? [];
      const byIndex = new Map<number,string>();
      for (const a of assignments) {
        const value = a.rank + ':' + a.suit;
        expect(byIndex.get(a.index) ?? value).toBe(value);
        byIndex.set(a.index,value);
      }
    }
  });
});

describe('Milestone 9 purchase and scoring effects', () => {
  it('prices the three wildcard tiers and preserves one modifier per physical card', () => {
    const run = startRun(undefined,()=>0.5);
    const progress = { ...createRunProgress(), upgradeChips: 1000 };
    const suit = purchaseCardModifier(run, progress, 0,'wild_suit');
    expect(suit.progress.upgradeChips).toBe(800);
    expect(() => purchaseCardModifier(suit.run,suit.progress,0,'wild_full')).toThrow('already');
    const rank = purchaseCardModifier(run, progress, 0,'wild_rank');
    expect(rank.progress.upgradeChips).toBe(700);
    const full = purchaseCardModifier(run, progress, 0,'wild_full');
    expect(full.progress.upgradeChips).toBe(500);
  });
  it('gold rewards upgrade chips only for scoring cards', () => {
    const cards=[card('A','spades'),card('2','hearts')];
    const option = listEligiblePokerHands(cards).find(x=>x.category==='high_card' && x.scoringCardIndices[0]===0)!;
    expect(goldCardReward(option,cards,{'spades:A':'gold','hearts:2':'gold'})).toBe(15);
    const run=startRun(undefined,()=>0.5);
    const progress={...createRunProgress(),upgradeChips:200};
    const withGold=purchaseCardModifier(run,progress,0,'gold').run;
    expect(playScoringHand(withGold,[0]).lastGoldReward).toBe(15);
  });
  it('echo adds base chips and growing increases with committed scoring use', () => {
    const cards=[card('A','spades')];
    const option=listEligiblePokerHands(cards)[0]!;
    expect(applyCardModifiers(option,cards,{'spades:A':'echo'}).score).toBe(10);
    expect(applyCardModifiers(option,cards,{'spades:A':'growing'},{'spades:A':3}).score).toBe(20);
    const run=startRun(undefined,()=>0.5);
    const progress={...createRunProgress(),upgradeChips:300};
    const modified=purchaseCardModifier(run,progress,0,'growing').run;
    const played=playScoringHand(modified,[0]);
    const key=modified.hand[0]!.suit+':'+modified.hand[0]!.rank;
    expect(played.cardGrowth?.[key]).toBe(1);
    expect(advanceRound({...played,phase:'round_won'},DEFAULT_ROUND_RULES).cardGrowth?.[key]).toBe(1);
    expect(startRun().cardGrowth).toEqual({});
  });
});
