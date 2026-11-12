import type { Card, CardRank, CardSuit } from '@pokermanic/contracts';
import type { CardModifierMap } from './modifiers.js';
import type { ScoringCategory } from './choices.js';

export interface WildAssignment { index: number; rank: CardRank; suit: CardSuit }
export interface WildMatch { category: Exclude<ScoringCategory, 'combination'>; assignments: WildAssignment[] }

const ranks: CardRank[] = ['A','K','Q','J','10','9','8','7','6','5','4','3','2'];
const suits: CardSuit[] = ['spades','hearts','diamonds','clubs'];
const numberRank = (rank: CardRank) => rank === 'A' ? 14 : rank === 'K' ? 13 : rank === 'Q' ? 12 : rank === 'J' ? 11 : Number(rank);
const rankNumber = (n: number): CardRank => n === 14 ? 'A' : n === 13 ? 'K' : n === 12 ? 'Q' : n === 11 ? 'J' : String(n) as CardRank;
const wildRank = (mod?: string) => mod === 'wild_rank' || mod === 'wild_full';
const wildSuit = (mod?: string) => mod === 'wild_suit' || mod === 'wild_full';

/** Match a pattern of ranks and optional uniform suit against DISTINCT physical cards.
 * Assigning a value never mutates the original card, and the mapping is preserved
 * for UI display and overlapping combination compatibility.
 */
function matchPattern(cards: readonly Card[], modifiers: Readonly<CardModifierMap>, pattern: readonly CardRank[] | null, suit?: CardSuit): WildAssignment[] | null {
  const slots = pattern ?? cards.map(c => c.rank);
  const assignment: WildAssignment[] = [];
  const used = new Set<number>();
  const order = cards.map((card, i) => ({ card, i, mod: modifiers[card.suit + ':' + card.rank] }))
    .sort((a,b) => Number(wildRank(a.mod)) - Number(wildRank(b.mod)));
  function visit(depth: number): boolean {
    if (depth === order.length) return true;
    const item = order[depth]!;
    const actualSuit = suit ?? item.card.suit;
    if (suit && item.card.suit !== suit && !wildSuit(item.mod)) return false;
    const seen = new Set<CardRank>();
    for (let j = 0; j < slots.length; j++) {
      const rank = slots[j]!;
      if (used.has(j) || seen.has(rank) || (item.card.rank !== rank && !wildRank(item.mod))) continue;
      seen.add(rank);
      used.add(j);
      if (wildRank(item.mod) || wildSuit(item.mod)) assignment.push({ index: item.i, rank, suit: actualSuit });
      if (visit(depth + 1)) return true;
      if (wildRank(item.mod) || wildSuit(item.mod)) assignment.pop();
      used.delete(j);
    }
    return false;
  }
  return visit(0) ? assignment.sort((a,b)=>a.index-b.index) : null;
}

function rankGroups(counts: readonly number[], callback: (pattern: CardRank[]) => boolean): boolean {
  function recur(group: number, used: Set<CardRank>, pattern: CardRank[]): boolean {
    if (group === counts.length) return callback(pattern);
    for (const rank of ranks) {
      if (used.has(rank)) continue;
      used.add(rank);
      if (recur(group + 1, used, [...pattern, ...Array(counts[group]!).fill(rank)])) return true;
      used.delete(rank);
    }
    return false;
  }
  return recur(0, new Set(), []);
}

function straights(size: number): CardRank[][] {
  const results: CardRank[][] = [];
  for (let high = 14; high >= size + 1; high--) {
    results.push(Array.from({length:size}, (_,i)=>rankNumber(high-i)));
  }
  if (size === 5) results.push(['A','5','4','3','2']);
  return results;
}

/** Evaluate all valid categories for a scoring subset, accounting for wild modifiers.
 * Rank-only wilds retain suit, suit-only wilds retain rank, full wilds change both.
 * The highest possible rank interpretation is chosen deterministically per category.
 */
export function matchingWildCategories(cards: readonly Card[], modifiers: Readonly<CardModifierMap>): WildMatch[] {
  const size = cards.length;
  const results: WildMatch[] = [];
  function add(category: WildMatch['category'], patterns: readonly (readonly CardRank[])[], suitOptions: (CardSuit | undefined)[] = [undefined]) {
    for (const pattern of patterns) for (const suit of suitOptions) {
      const assignments = matchPattern(cards, modifiers, pattern, suit);
      if (assignments) { results.push({ category, assignments }); return; }
    }
  }
  function groups(category: WildMatch['category'], counts: number[]) {
    rankGroups(counts, pattern => {
      const assignments = matchPattern(cards, modifiers, pattern);
      if (!assignments) return false;
      results.push({ category, assignments });
      return true;
    });
  }
  if (size === 1) {
    add('high_card', [['A'], ...ranks.slice(1).map(rank=>[rank])]);
  }
  if (size === 2) groups('pair',[2]);
  if (size === 3) groups('three_of_a_kind',[3]);
  if (size === 4) {
    groups('four_of_a_kind',[4]);
    groups('two_pair',[2,2]);
  }
  if (size === 5) groups('five_of_a_kind',[5]);
  if (size === 6) groups('three_pair',[2,2,2]);
  if (size === 8) groups('four_pair',[2,2,2,2]);
  if (size >= 5) {
    for (let first = size - 2; first >= 3; first--) {
      const before = results.length;
      groups('full_house',[first,size-first]);
      if (results.length !== before) break;
    }
    // Suit-only matching leaves the original ranks unchanged.
    add('flush',[cards.map(card=>card.rank)],suits);
    const sequences = straights(size);
    add('straight',sequences);
    add('straight_flush',sequences,suits);
    if (size === 5) add('royal_flush',[['A','K','Q','J','10']],suits);
  }
  return results;
}
