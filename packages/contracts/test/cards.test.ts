import { describe, expect, it } from 'vitest';
import {
  CARD_RANKS, CARD_SUITS, cardSchema, cardRankSchema, cardSuitSchema,
} from '../src/index';

describe('playing-card contracts', () => {
  it('defines four suits and thirteen ranks', () => {
    expect(CARD_SUITS).toHaveLength(4);
    expect(CARD_RANKS).toHaveLength(13);
    expect(new Set(CARD_SUITS).size).toBe(4);
    expect(new Set(CARD_RANKS).size).toBe(13);
  });

  it('validates a playing card using the shared Zod contract', () => {
    expect(cardSchema.parse({ suit: 'hearts', rank: 'A' }))
      .toEqual({ suit: 'hearts', rank: 'A' });
    expect(cardSuitSchema.safeParse('clubs').success).toBe(true);
    expect(cardRankSchema.safeParse('10').success).toBe(true);
  });

  it('rejects invalid suits, ranks, and unknown fields', () => {
    expect(cardSchema.safeParse({ suit: 'stars', rank: 'A' }).success).toBe(false);
    expect(cardSchema.safeParse({ suit: 'clubs', rank: '1' }).success).toBe(false);
    expect(cardSchema.safeParse({ suit: 'clubs', rank: 'A', joker: true }).success).toBe(false);
  });
});
