import { describe, expect, it } from 'vitest';
import { CARD_RANKS, CARD_SUITS } from '../src/cards.js';
import { GAME_SAVE_STORAGE_KEY, formatGameSave, gameSaveV1Schema, parseGameSave } from '../src/game-save.js';

const allCards = CARD_SUITS.flatMap(suit => CARD_RANKS.map(rank => ({ suit, rank })));
const base = {
  version: 1 as const,
  savedAt: '2026-11-12T12:00:00.000Z',
  run: {
    phase: 'playing' as const, round: 1, roundTarget: 60, roundChips: 0, totalChips: 0,
    handsRemaining: 4, discardsRemaining: 3, handsPlayed: 0,
    hand: allCards.slice(0, 8), drawPile: allCards.slice(8),
    playedCards: [], discardedCards: [], lastScored: null,
  },
  rules: {
    handSize: 8, cardsPerPlay: 5, maxCardsPerDiscard: 5,
    baseHandsPerRound: 4, baseDiscardsPerRound: 3, extraHandEveryRounds: 4,
    extraDiscardEveryRounds: 6, baseChipTarget: 60, chipTargetStep: 40,
    chipTargetAcceleration: 15,
  },
  progress: {
    upgradeChips: 0, rewardedThroughRound: 0,
    levels: {
      extra_hand: 0, extra_discard: 0, hand_size: 0,
      cards_per_play: 0, discard_batch: 0, manual_selection: 0,
    },
  },
  profile: { lifetimeRunsStarted: 1, bestRound: 1 },
  ui: { selectedIndexes: [0], selectionMode: 'automatic' as const, manualOptionId: null, sortMode: 'rank' as const },
};
describe('editable game save v1', () => {
  it('round-trips a readable, versioned JSON save', () => {
    const json = formatGameSave(base);
    expect(JSON.parse(json).version).toBe(1);
    expect(parseGameSave(json)).toMatchObject(base);
    expect(parseGameSave(json).profile.prestigeChips).toBe(0);
    expect(parseGameSave(json).profile.transcends).toBe(0);
    expect(GAME_SAVE_STORAGE_KEY).toBe('pokermanic.save.v1');
  });
  it('validates optional permanent upgrades', () => {
    const profile = { ...base.profile, prestigeChips: 20, transcends: 2,
      permanentLevels: { starting_hand: 1, starting_discard: 2, starting_chips: 3 } };
    expect(gameSaveV1Schema.parse({ ...base, profile }).profile.prestigeChips).toBe(20);
    expect(gameSaveV1Schema.safeParse({ ...base, profile: {
      ...profile, permanentLevels: { ...profile.permanentLevels, starting_hand: 4 },
    } }).success).toBe(false);
  });
  it('allows intentional player modifications to valid chip counts', () => {
    const custom = structuredClone(base);
    custom.progress.upgradeChips = 9999;
    custom.run.roundChips = 45;
    custom.run.totalChips = 1000;
    expect(gameSaveV1Schema.parse(custom).progress.upgradeChips).toBe(9999);
  });
  it('rejects unknown versions, duplicate cards, missing deck cards and invalid selection', () => {
    expect(gameSaveV1Schema.safeParse({ ...base, version: 2 }).success).toBe(false);
    expect(gameSaveV1Schema.safeParse({ ...base, run: { ...base.run, drawPile: allCards.slice(9) } }).success).toBe(false);
    expect(gameSaveV1Schema.safeParse({ ...base, run: { ...base.run, drawPile: [allCards[0], ...allCards.slice(9)] } }).success).toBe(false);
    expect(gameSaveV1Schema.safeParse({ ...base, ui: { ...base.ui, selectedIndexes: [100] } }).success).toBe(false);
    expect(() => parseGameSave('{bad')).toThrow();
  });
  it('requires the Manual Selection perk before saving manual mode', () => {
    expect(gameSaveV1Schema.safeParse({ ...base, ui: { ...base.ui, selectionMode: 'manual' } }).success).toBe(false);
  });
});
