import type { Card } from '@pokermanic/contracts';
import type { RunState } from './rounds.js';
import type { RunProgress } from './progression.js';
import type { ScoringOption } from './choices.js';

export type CardModifier = 'bonus' | 'multiplier';
export type CardModifierMap = Record<string, CardModifier>;
export const CARD_MODIFIERS = [
  { id: 'bonus', label: 'Bonus card', description: '+10 base chips when this card scores.', cost: 100 },
  { id: 'multiplier', label: 'Multiplier card', description: 'Multiply the final score by 1.5 when this card scores.', cost: 180 },
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
export function applyCardModifiers(
  option: Readonly<ScoringOption>, committed: readonly Card[], modifiers: Readonly<CardModifierMap> = {},
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
    if (modifiers[key] === 'multiplier') multipliers++;
  }
  if (bonus === 0 && multipliers === 0) return { ...option };
  const factor = 1.5 ** multipliers;
  const score = Math.round((option.score + bonus * (option.multiplier || 1)) * factor);
  if (!Number.isSafeInteger(score)) throw new RangeError('Modified score exceeds safe precision.');
  return { ...option, score, modifierBonusChips: bonus, modifierMultiplier: factor };
}
