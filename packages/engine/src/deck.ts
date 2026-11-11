import { CARD_RANKS, CARD_SUITS, type Card } from '@pokermanic/contracts';

/** Create a fresh, ordered deck containing exactly one of every rank/suit pair. */
export function createStandardDeck(): Card[] {
  return CARD_SUITS.flatMap((suit) =>
    CARD_RANKS.map((rank) => ({ suit, rank })),
  );
}

/**
 * Return a new shuffled deck without modifying the input.
 * Fisher–Yates gives an unbiased permutation when random() is uniform in [0, 1).
 * Inject random() in tests to make results deterministic.
 */
export function shuffleDeck(
  deck: readonly Card[],
  random: () => number = Math.random,
): Card[] {
  const shuffled = [...deck];

  for (let index = shuffled.length - 1; index > 0; index--) {
    const value = random();
    if (!Number.isFinite(value) || value < 0 || value >= 1) {
      throw new RangeError('random() must return a finite number in [0, 1).');
    }

    const swapIndex = Math.floor(value * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex]!,
      shuffled[index]!,
    ];
  }
  return shuffled;
}

/** Take count cards from the top, preserving order and leaving the original deck untouched. */
export function dealCards(
  deck: readonly Card[],
  count: number,
): { hand: Card[]; remainingDeck: Card[] } {
  if (!Number.isInteger(count) || count < 0 || count > deck.length) {
    throw new RangeError('count must be an integer between 0 and deck.length.');
  }

  return {
    hand: deck.slice(0, count),
    remainingDeck: deck.slice(count),
  };
}
