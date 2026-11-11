import type { Card, CardRank, CardSuit } from '@pokermanic/contracts';

export type HandSortMode = 'dealt' | 'rank' | 'suit';
export interface IndexedCard { card: Card; originalIndex: number }

const RANKS: readonly CardRank[] = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
const SUITS: readonly CardSuit[] = ['clubs','diamonds','hearts','spades'];
const rankValue = (rank: CardRank): number => RANKS.indexOf(rank);
const suitValue = (suit: CardSuit): number => SUITS.indexOf(suit);

/** Sort presentation only, keeping original indices intact for game actions.
 * Both modes descend: A..2 and ♠ ♥ ♦ ♣.
 */
export function sortHandForDisplay(hand: readonly Card[], mode: HandSortMode): IndexedCard[] {
  const indexed = hand.map((card, originalIndex) => ({ card, originalIndex }));
  if (mode === 'dealt') return indexed;
  if (mode !== 'rank' && mode !== 'suit') throw new RangeError('Unknown card sort mode.');
  return indexed.sort((a,b) => {
    const byRank = rankValue(b.card.rank) - rankValue(a.card.rank);
    const bySuit = suitValue(b.card.suit) - suitValue(a.card.suit);
    return (mode === 'rank' ? byRank || bySuit : bySuit || byRank)
      || a.originalIndex - b.originalIndex;
  });
}
