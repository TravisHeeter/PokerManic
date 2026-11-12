import { cardSchema, type Card, type CardRank } from '@pokermanic/contracts';
import { POKER_HAND_VALUES, type PokerHandCategory } from './scoring.js';
import { matchingWildCategories, type WildAssignment } from './wild.js';
import type { CardModifierMap } from './modifiers.js';

/**
 * An eligible formation uses a subset of the cards the player has committed.
 * Indices are positional within the passed cards until unique card-instance IDs
 * are introduced with the player inventory and card-modifier system.
 */
export type ScoringCategory = PokerHandCategory | 'three_pair' | 'four_pair' | 'combination';

export interface ScoringOption {
  id: string;
  category: ScoringCategory;
  label: string;
  scoringCardIndices: number[];
  baseChips: number;
  multiplier: number;
  score: number;
  /** Optional run-long card modifier totals applied to the chosen formation. */
  modifierBonusChips?: number;
  modifierMultiplier?: number;
  wildAssignments?: WildAssignment[];
  /** Present only for a two-formation scoring combination. */
  components?: [ScoringComponent, ScoringComponent];
  combinationType?: 'separate' | 'overlapping';
}

export interface ScoringComponent {
  id: string;
  category: Exclude<ScoringCategory, 'combination'>;
  label: string;
  scoringCardIndices: number[];
  baseChips: number;
  multiplier: number;
  score: number;
  wildAssignments?: WildAssignment[];
}

export interface HandSelectionSettings {
  manualSelectionUnlocked: boolean;
  selectionMode: 'automatic' | 'manual';
}

/**
 * Provisional size premium for expanded poker formations: each extra card
 * adds 25% of the category's five-card base chips (6: 1.25x, 7: 1.5x, 8: 1.75x).
 * Five-card hand values and multipliers remain unchanged.
 */
export const EXTRA_CARD_BASE_CHIP_RATE = 0.25;

function expandedBaseChips(category: ScoringCategory, baseChips: number, count: number): number {
  if (count <= 5 || !['straight','flush','full_house','straight_flush'].includes(category)) {
    return baseChips;
  }
  return Math.round(baseChips * (1 + (count - 5) * EXTRA_CARD_BASE_CHIP_RATE));
}

const EXTRA_PAIR_VALUES = {
  three_pair: { label: 'Three pair', baseChips: 30, multiplier: 3 },
  four_pair: { label: 'Four pair', baseChips: 40, multiplier: 4 },
} as const;

// Strongest *poker-ranking* formation wins in automatic mode, not
// necessarily the formation with the highest score after upgrades.
const CATEGORY_STRENGTH: Record<ScoringCategory, number> = {
  combination: 0,
  high_card: 1,
  pair: 2,
  two_pair: 3,
  three_pair: 4,
  four_pair: 5,
  three_of_a_kind: 6,
  straight: 7,
  flush: 8,
  full_house: 9,
  four_of_a_kind: 10,
  straight_flush: 11,
  royal_flush: 12,
  five_of_a_kind: 13,
};

const RANK_VALUE: Record<CardRank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
  '8': 8, '9': 9, '10': 10, J: 11, Q: 12, K: 13, A: 14,
};

function isStraight(values: readonly number[]): boolean {
  if (values.length < 5 || new Set(values).size !== values.length) return false;
  const ascending = [...values].sort((a, b) => a - b);
  // Exactly one wheel straight is supported; A-2-3-4-5.
  if (ascending.length === 5 && ascending.join(',') === '2,3,4,5,14') return true;
  return ascending.every((value, i) => value === ascending[0]! + i);
}

function matchingCategories(cards: readonly Card[]): Exclude<ScoringCategory, 'combination'>[] {
  const size = cards.length;
  if (size === 1) return ['high_card'];
  const ranks = cards.map((card) => RANK_VALUE[card.rank]);
  const counts = new Map<number, number>();
  for (const rank of ranks) counts.set(rank, (counts.get(rank) ?? 0) + 1);
  const frequencies = [...counts.values()].sort((a, b) => b - a);
  const result: Exclude<ScoringCategory, 'combination'>[] = [];

  if (size === 2 && frequencies[0] === 2) result.push('pair');
  if (size === 3 && frequencies[0] === 3) result.push('three_of_a_kind');
  if (size === 4 && frequencies[0] === 4) result.push('four_of_a_kind');

  // Exact two-, three- and four-pair sets, with no additional scoring cards.
  if (size === 4 && frequencies.every((count) => count === 2)) result.push('two_pair');
  if (size === 6 && frequencies.length === 3 && frequencies.every((count) => count === 2)) result.push('three_pair');
  if (size === 8 && frequencies.length === 4 && frequencies.every((count) => count === 2)) result.push('four_pair');

  // Variable-size houses allow 3+2, 3+3, 4+2, 4+3 or 4+4.
  if (size >= 5 && frequencies.length === 2 && frequencies[0]! >= 3 && frequencies[1]! >= 2) {
    result.push('full_house');
  }

  if (size >= 5) {
    const straight = isStraight(ranks);
    const flush = cards.every((card) => card.suit === cards[0]!.suit);
    if (straight) result.push('straight');
    if (flush) result.push('flush');
    if (straight && flush) {
      result.push('straight_flush');
      if (size === 5 && [...ranks].sort((a, b) => a - b).join(',') === '10,11,12,13,14') {
        result.push('royal_flush');
      }
    }
  }
  return result;
}

function numericRankKey(option: ScoringOption, cards: readonly Card[]): number[] {
  const rankValues = option.scoringCardIndices
    .map((index) => RANK_VALUE[cards[index]!.rank])
    .sort((a, b) => b - a);

  // Auto selection among straight options should favor the high straight.
  // For all other ties, favor the high contributing ranks as a simple default.
  if ((option.category === 'straight' || option.category === 'straight_flush')
    && rankValues.join(',') === '14,5,4,3,2') {
    return [5, 4, 3, 2, 1];
  }
  return rankValues;
}

function compareRanks(a: readonly number[], b: readonly number[]): number {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const difference = (b[i] ?? -1) - (a[i] ?? -1);
    if (difference !== 0) return difference;
  }
  return 0;
}


function categoryStrength(option: ScoringOption): number {
  return option.components
    ? Math.max(...option.components.map((component) => CATEGORY_STRENGTH[component.category]))
    : CATEGORY_STRENGTH[option.category];
}

function isContained(a: readonly number[], b: readonly number[]): boolean {
  const bSet = new Set(b);
  return a.every((index) => bSet.has(index));
}

/**
 * Combine exactly two independent qualifying formations.
 * - Disjoint cards: add both calculated scores.
 * - Shared card(s): add base chips and multipliers, then multiply.
 * A formation wholly contained in another does not count as an extra hand.
 * Avoid High Card add-ons and composite-of-composite scoring.
 */
function combinedOptions(options: readonly ScoringOption[]): ScoringOption[] {
  const candidates = options.filter((option) => option.category !== 'high_card'
    && option.category !== 'combination');
  const result: ScoringOption[] = [];
  for (let i = 0; i < candidates.length; i++) {
    const a = candidates[i]!;
    for (let j = i + 1; j < candidates.length; j++) {
      const b = candidates[j]!;
      // Overlapping wild cards must use one consistent interpretation.
      const wildA = new Map((a.wildAssignments ?? []).map(w => [w.index, w]));
      if ((b.wildAssignments ?? []).some(w => {
        const other = wildA.get(w.index);
        return other && (other.rank !== w.rank || other.suit !== w.suit);
      })) continue;
      if (isContained(a.scoringCardIndices, b.scoringCardIndices)
        || isContained(b.scoringCardIndices, a.scoringCardIndices)) continue;
      const union = [...new Set([...a.scoringCardIndices, ...b.scoringCardIndices])]
        .sort((x, y) => x - y);
      const overlap = union.length < a.scoringCardIndices.length + b.scoringCardIndices.length;
      const baseChips = a.baseChips + b.baseChips;
      const multiplier = overlap ? a.multiplier + b.multiplier : 0;
      const score = overlap ? baseChips * multiplier : a.score + b.score;
      if (!Number.isSafeInteger(score)) throw new RangeError('Combined score exceeds safe integer precision.');
      result.push({
        id: `combination:${a.id}|${b.id}`,
        category: 'combination',
        label: `${a.label} + ${b.label}`,
        scoringCardIndices: union,
        baseChips,
        multiplier,
        score,
        components: [a as ScoringComponent, b as ScoringComponent],
        combinationType: overlap ? 'overlapping' : 'separate',
        wildAssignments: [...new Map([...(a.wildAssignments ?? []), ...(b.wildAssignments ?? [])]
          .map(w => [w.index, w])).values()].sort((x,y)=>x.index-y.index),
      });
    }
  }
  return result;
}

/**
 * List EVERY qualifying scoring subset of the committed cards, including
 * each individual high-card choice even when a better hand is also present.
 * The hard limit of eight applies only to this early engine, not game design.
 * No perk is granted here; selection is enforced by resolveScoringOption.
 */
export function listEligiblePokerHands(cards: readonly Card[], modifiers: Readonly<CardModifierMap> = {}): ScoringOption[] {
  if (cards.length > 8) {
    throw new RangeError('This milestone supports up to eight committed cards.');
  }
  const validCards = cards.map((card) => cardSchema.parse(card));
  const unique = new Set(validCards.map(({ suit, rank }) => `${suit}:${rank}`));
  if (unique.size !== validCards.length) {
    throw new RangeError('A played group cannot contain duplicate standard cards.');
  }

  const options: ScoringOption[] = [];
  for (let mask = 1; mask < (1 << validCards.length); mask++) {
    const scoringCardIndices = validCards.flatMap((_, i) => mask & (1 << i) ? [i] : []);
    const subset = scoringCardIndices.map((i) => validCards[i]!);
    const hasWild = subset.some(card => ['wild_suit','wild_rank','wild_full'].includes(modifiers[card.suit + ':' + card.rank] ?? ''));
    const matches = hasWild
      ? matchingWildCategories(subset, modifiers)
      : matchingCategories(subset).map(category => ({ category, assignments: [] as WildAssignment[] }));
    for (const { category, assignments } of matches) {
      const entry = category === 'three_pair' || category === 'four_pair'
        ? EXTRA_PAIR_VALUES[category]
        : POKER_HAND_VALUES[category];
      const label = subset.length > 5 && ['straight', 'flush', 'full_house', 'straight_flush'].includes(category)
        ? `${subset.length}-card ${entry.label.toLowerCase()}`
        : entry.label;
      const baseChips = expandedBaseChips(category, entry.baseChips, subset.length);
      options.push({
        id: `${category}:${scoringCardIndices.join('-')}`,
        category,
        label,
        scoringCardIndices,
        baseChips,
        multiplier: entry.multiplier,
        score: baseChips * entry.multiplier,
        ...(assignments.length ? { wildAssignments: assignments.map(w => ({ ...w, index: scoringCardIndices[w.index]! })) } : {}),
      });
    }
  }

  options.push(...combinedOptions(options));
  options.sort((a, b) =>
    categoryStrength(b) - categoryStrength(a)
    || Number(Boolean(b.components)) - Number(Boolean(a.components))
    || b.scoringCardIndices.length - a.scoringCardIndices.length
    || compareRanks(numericRankKey(a, validCards), numericRankKey(b, validCards))
    || a.id.localeCompare(b.id),
  );
  return options;
}

/** Return the selected option; until the perk is unlocked, force automatic. */
export function resolveScoringOption(
  options: readonly ScoringOption[],
  settings: HandSelectionSettings,
  manualOptionId?: string,
): ScoringOption | null {
  const automatic = options[0] ?? null;
  if (!settings.manualSelectionUnlocked || settings.selectionMode === 'automatic') {
    return automatic;
  }
  return options.find((option) => option.id === manualOptionId) ?? automatic;
}
