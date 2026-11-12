import { z } from 'zod';
import { cardSchema } from './cards.js';

/**
 * Human-readable, versioned save format. Browser storage is intentionally
 * editable: there is no signature, encryption, or anti-cheat mechanism.
 * Schema validation catches broken structure, not customized game balance.
 */
const safeInt = z.number().int().safe().nonnegative();
const positiveInt = z.number().int().safe().positive();
const scoringCategory = z.enum([
  'high_card', 'pair', 'two_pair', 'three_pair', 'four_pair',
  'three_of_a_kind', 'straight', 'flush', 'full_house',
  'four_of_a_kind', 'straight_flush', 'royal_flush', 'combination',
]);
const cardIndices = z.array(safeInt);
const scoreComponentSchema = z.strictObject({
  id: z.string(),
  category: scoringCategory.exclude(['combination']),
  label: z.string(),
  scoringCardIndices: cardIndices,
  baseChips: safeInt,
  multiplier: safeInt,
  score: safeInt,
});
const scoreSchema = z.strictObject({
  id: z.string(),
  category: scoringCategory,
  label: z.string(),
  scoringCardIndices: cardIndices,
  baseChips: safeInt,
  multiplier: safeInt,
  score: safeInt,
  components: z.tuple([scoreComponentSchema, scoreComponentSchema]).optional(),
  combinationType: z.enum(['separate', 'overlapping']).optional(),
});
export const savedRulesSchema = z.strictObject({
  handSize: positiveInt.max(52),
  cardsPerPlay: positiveInt.max(8),
  maxCardsPerDiscard: positiveInt.max(52),
  baseHandsPerRound: positiveInt,
  baseDiscardsPerRound: safeInt,
  extraHandEveryRounds: positiveInt,
  extraDiscardEveryRounds: positiveInt,
  baseChipTarget: positiveInt,
  chipTargetStep: safeInt,
  chipTargetAcceleration: safeInt,
}).refine(r => r.cardsPerPlay <= r.handSize && r.maxCardsPerDiscard <= r.handSize,
  'Card play/discard limits cannot exceed hand size');

export const savedRunSchema = z.strictObject({
  phase: z.enum(['playing', 'round_won', 'game_over']),
  round: positiveInt,
  roundTarget: positiveInt,
  roundChips: safeInt,
  totalChips: safeInt,
  handsRemaining: safeInt,
  discardsRemaining: safeInt,
  handsPlayed: safeInt,
  hand: z.array(cardSchema),
  drawPile: z.array(cardSchema),
  playedCards: z.array(cardSchema),
  discardedCards: z.array(cardSchema),
  lastScored: scoreSchema.nullable(),
});

export const savedProgressSchema = z.strictObject({
  upgradeChips: safeInt,
  rewardedThroughRound: safeInt,
  levels: z.strictObject({
    extra_hand: safeInt.max(4),
    extra_discard: safeInt.max(4),
    hand_size: safeInt.max(4),
    cards_per_play: safeInt.max(3),
    discard_batch: safeInt.max(3),
    manual_selection: safeInt.max(1),
  }),
});

export const savedProfileSchema = z.strictObject({
  lifetimeRunsStarted: positiveInt,
  bestRound: positiveInt,
});

export const gameSaveV1Schema = z.strictObject({
  version: z.literal(1),
  savedAt: z.iso.datetime(),
  run: savedRunSchema,
  progress: savedProgressSchema,
  rules: savedRulesSchema,
  profile: savedProfileSchema,
  ui: z.strictObject({
    selectedIndexes: cardIndices,
    selectionMode: z.enum(['automatic', 'manual']),
    manualOptionId: z.string().nullable(),
    sortMode: z.enum(['dealt', 'rank', 'suit']),
  }),
}).superRefine((save, ctx) => {
  const error = (message: string) => ctx.addIssue({ code: 'custom', message });
  if (save.run.hand.length !== save.rules.handSize) error('Held hand size does not match saved rules');
  const cards = [
    ...save.run.hand, ...save.run.drawPile,
    ...save.run.playedCards, ...save.run.discardedCards,
  ];
  if (cards.length !== 52) error('A saved standard deck must contain exactly 52 cards');
  if (new Set(cards.map(card => card.suit + ':' + card.rank)).size !== cards.length) {
    error('Card instances must be unique across hand and all piles');
  }
  if (save.run.totalChips < save.run.roundChips) error('Total chips cannot be less than round chips');
  if (save.progress.rewardedThroughRound > save.run.round) error('Reward progress is ahead of the current round');
  if (save.ui.selectionMode === 'manual' && save.progress.levels.manual_selection === 0) {
    error('Manual mode requires the purchased perk');
  }
  const indexes = save.ui.selectedIndexes;
  if (new Set(indexes).size !== indexes.length ||
    indexes.some(index => index >= save.run.hand.length)) {
    error('Selected card indices must exist in the saved hand without duplicates');
  }
  if (indexes.length > Math.max(save.rules.cardsPerPlay, save.rules.maxCardsPerDiscard)) {
    error('Too many selected cards for the current rules');
  }
});

export type GameSaveV1 = z.infer<typeof gameSaveV1Schema>;
export type SavedProfile = z.infer<typeof savedProfileSchema>;

/** The key and top-level version are public modding interfaces. */
export const GAME_SAVE_STORAGE_KEY = 'pokermanic.save.v1';
export function parseGameSave(json: string): GameSaveV1 {
  return gameSaveV1Schema.parse(JSON.parse(json));
}
export function formatGameSave(save: GameSaveV1): string {
  return JSON.stringify(gameSaveV1Schema.parse(save), null, 2);
}
