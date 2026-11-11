import { describe, expect, it } from 'vitest';
import type { Card } from '@pokermanic/contracts';
import { sortHandForDisplay } from '../src/index';

const hand: Card[] = [
  { rank:'9',suit:'hearts' }, { rank:'A',suit:'clubs' },
  { rank:'9',suit:'spades' }, { rank:'K',suit:'hearts' },
  { rank:'2',suit:'diamonds' }, { rank:'A',suit:'spades' },
];
const name = (card:Card) => `${card.rank}:${card.suit}`;

describe('sortHandForDisplay', () => {
  it('leaves dealt order intact and never mutates the original hand', () => {
    const before = structuredClone(hand);
    const sorted = sortHandForDisplay(hand,'dealt');
    expect(sorted.map(x => x.originalIndex)).toEqual([0,1,2,3,4,5]);
    expect(sorted.map(x => name(x.card))).toEqual(hand.map(name));
    expect(hand).toEqual(before);
    expect(sorted).not.toBe(hand);
  });
  it('sorts Ace down, and breaks rank ties with suit', () => {
    expect(sortHandForDisplay(hand,'rank').map(x => x.originalIndex)).toEqual([5,1,3,2,0,4]);
  });
  it('groups by suit ♠ ♥ ♦ ♣, high ranks first', () => {
    expect(sortHandForDisplay(hand,'suit').map(x => x.originalIndex)).toEqual([5,2,3,0,4,1]);
  });
  it('keeps selected and scoring cards mapped to the same game indices after sorting', () => {
    const selected = new Set([0,5]), scoring = new Set([5]);
    for (const mode of ['dealt','rank','suit'] as const) {
      const displayed = sortHandForDisplay(hand,mode);
      expect(displayed.filter(x => selected.has(x.originalIndex)).map(x => name(x.card)).sort())
        .toEqual(['9:hearts','A:spades'].sort());
      expect(displayed.filter(x => scoring.has(x.originalIndex)).map(x => name(x.card)))
        .toEqual(['A:spades']);
      expect(new Set(displayed.map(x=>x.originalIndex)).size).toBe(hand.length);
    }
  });
  it('preserves distinct indices for identical-looking future card instances', () => {
    const duplicate:Card[] = [{rank:'J',suit:'clubs'},{rank:'J',suit:'clubs'},{rank:'A',suit:'hearts'}];
    expect(sortHandForDisplay(duplicate,'rank').map(x=>x.originalIndex)).toEqual([2,0,1]);
  });
  it('rejects invalid sort modes', () => {
    expect(() => sortHandForDisplay(hand,'unknown' as 'suit')).toThrow(RangeError);
  });
});
