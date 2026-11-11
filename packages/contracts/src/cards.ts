import { z } from 'zod';

// The base deck uses a conventional 52-card rank/suit model.
// Individual card IDs and modifications will be introduced with game state.
export const CARD_SUITS = ['hearts', 'diamonds', 'clubs', 'spades'] as const;
export const CARD_RANKS = [
  '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A',
] as const;

export const cardSuitSchema = z.enum(CARD_SUITS);
export const cardRankSchema = z.enum(CARD_RANKS);
export const cardSchema = z.strictObject({
  suit: cardSuitSchema,
  rank: cardRankSchema,
});

export type CardSuit = z.infer<typeof cardSuitSchema>;
export type CardRank = z.infer<typeof cardRankSchema>;
export type Card = z.infer<typeof cardSchema>;
