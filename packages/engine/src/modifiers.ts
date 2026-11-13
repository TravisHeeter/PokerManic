import type { Card } from '@pokermanic/contracts';
import type { RunState } from './rounds.js';
import type { RunProgress } from './progression.js';
import type { ScoringOption } from './choices.js';

export type CardModifier = 'bonus' | 'multiplier' | 'gold' | 'echo' | 'growing' | 'wild_suit' | 'wild_rank' | 'wild_full';
export type CardModifierMap = Record<string, CardModifier>;
export const CARD_MODIFIERS = [
  { id: 'bonus', label: 'Bonus card', description: '+10 base chips when this card scores.', cost: 100 },
  { id: 'multiplier', label: 'Multiplier card', description: 'Multiply the final score by 1.5 when this card scores.', cost: 180 },
  { id: 'gold', label: 'Gold card', description: 'Earn 15 upgrade chips when this card contributes to scoring.', cost: 160 },
  { id: 'echo', label: 'Echo card', description: 'Add this formation’s base chips again when the card scores.', cost: 220 },
  { id: 'growing', label: 'Growing card', description: 'Gain +5 base chips per prior scoring use this run.', cost: 240 },
  { id: 'wild_suit', label: 'Suit Wild', description: 'Counts as any suit while retaining its printed rank.', cost: 200 },
  { id: 'wild_rank', label: 'Rank Wild', description: 'Counts as any rank while retaining its printed suit.', cost: 300 },
  { id: 'wild_full', label: 'Full Wild', description: 'Counts as any rank and any suit.', cost: 500 },
] as const;
export function cardIdentity(card: Pick<Card, 'suit' | 'rank'>): string {
  return card.suit + ':' + card.rank;
}
export function purchaseCardModifier(
  run: Readonly<RunState>, progress: Readonly<RunProgress>, handIndex: number, id: CardModifier,
): { run: RunState; progress: RunProgress } {
  if (run.phase !== 'playing') throw new Error('Card modifiers are available only during active rounds.');
  const def = CARD_MODIFIERS.find(item => item.id === id);
  if (!def) throw new RangeError('Unknown card modifier.');
  if (!Number.isSafeInteger(handIndex) || handIndex < 0 || handIndex >= run.hand.length) {
    throw new RangeError('Choose a card from your current hand.');
  }
  const key = cardIdentity(run.hand[handIndex]!);
  if (run.cardModifiers?.[key]) throw new Error('This card already has a modifier.');
  if (progress.upgradeChips < def.cost) throw new Error('Not enough upgrade chips.');
  return {
    run: { ...run, cardModifiers: { ...run.cardModifiers, [key]: id } },
    progress: { ...progress, upgradeChips: progress.upgradeChips - def.cost },
  };
}
/** Applied once per contributing physical card, even for overlapping combinations. */
/** Upgrade-chip payout from Gold cards is awarded on committed scoring only, never on preview. */
export function goldCardReward(option: Readonly<ScoringOption>, committed: readonly Card[], modifiers: Readonly<CardModifierMap> = {}): number {
  return option.scoringCardIndices.filter(index => modifiers[cardIdentity(committed[index]!)] === 'gold').length * 15;
}

export function applyCardModifiers(
  option: Readonly<ScoringOption>, committed: readonly Card[], modifiers: Readonly<CardModifierMap> = {},
  growth: Readonly<Record<string, number>> = {},
): ScoringOption {
  let bonus = 0;
  let multipliers = 0;
  const used = new Set<string>();
  for (const index of option.scoringCardIndices) {
    const card = committed[index];
    if (!card) throw new RangeError('Scoring index refers to a missing card.');
    const key = cardIdentity(card);
    if (used.has(key)) continue;
    used.add(key);
    if (modifiers[key] === 'bonus') bonus += 10;
    if (modifiers[key] === 'echo') bonus += option.baseChips;
    if (modifiers[key] === 'growing') bonus += 5 * (growth[key] ?? 0);
    if (modifiers[key] === 'multiplier') multipliers++;
  }
  if (bonus === 0 && multipliers === 0) return { ...option };
  const factor = 1.5 ** multipliers;
  const score = Math.round((option.score + bonus * (option.multiplier || 1)) * factor);
  if (!Number.isSafeInteger(score)) throw new RangeError('Modified score exceeds safe precision.');
  return { ...option, score, modifierBonusChips: bonus, modifierMultiplier: factor };
}
