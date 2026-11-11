<script setup lang="ts">
import type { Card, CardSuit } from '@pokermanic/contracts';
defineProps<{
  hand: Card[];
  selectedIndexes: number[];
  scoringCardIndexes: number[];
  cardsPerPlay: number;
  maxCardsPerDiscard: number;
  round: number;
  handsPlayed: number;
  inRound: boolean;
}>();
const emit = defineEmits<{ 'toggle-card': [index: number] }>();
const SUIT_SYMBOLS: Record<CardSuit, string> = {
  hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠',
};
const SUIT_TEXT: Record<CardSuit, string> = {
  hearts: 'text-[#87565D]',
  diamonds: 'text-[#998258]',
  clubs: 'text-[#577A75]',
  spades: 'text-slate-800',
};
</script>

<template>
            <p class="text-sm text-muted">
              Choose {{ cardsPerPlay }} cards to score, or select up to {{ maxCardsPerDiscard }} to discard.
              The game scores the strongest qualifying hand automatically
              until the Manual Hand Selection perk is unlocked.
              <strong data-testid="selected-count" class="text-highlighted">{{ selectedIndexes.length }} selected · {{ cardsPerPlay }} to score</strong>
            </p>

            <div data-testid="card-hand" aria-label="Current eight-card hand" class="grid grid-cols-4 gap-2 sm:grid-cols-8 sm:gap-3">
              <button
                v-for="(card, index) in hand"
                type="button"
                :key="`${round}-${handsPlayed}-${index}-${card.suit}-${card.rank}`"
                data-testid="playing-card"
                :aria-label="`${selectedIndexes.includes(index) ? 'Deselect' : 'Select'} ${card.rank} of ${card.suit}`"
                :aria-pressed="selectedIndexes.includes(index)"
                :disabled="!inRound || (selectedIndexes.length === Math.max(cardsPerPlay, maxCardsPerDiscard) && !selectedIndexes.includes(index))"
                @click="emit('toggle-card', index)"
                class="relative flex aspect-[5/7] select-none flex-col justify-between rounded-xl border border-slate-200 bg-[#faf8f1] p-2 text-left shadow-lg shadow-black/30 transition-all hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 disabled:cursor-not-allowed disabled:opacity-60 sm:p-3"
                :data-scoring-card="scoringCardIndexes.includes(index) ? 'true' : 'false'"
                :class="[
                  SUIT_TEXT[card.suit],
                  scoringCardIndexes.includes(index) ? '-translate-y-2 ring-4 ring-amber-300' :
                    selectedIndexes.includes(index) ? '-translate-y-1 ring-2 ring-sky-500' : '',
                ]"
              >
                <div class="flex flex-col items-start leading-none">
                  <span class="text-lg font-bold sm:text-2xl">{{ card.rank }}</span>
                  <span class="mt-1 text-lg sm:text-xl">{{ SUIT_SYMBOLS[card.suit] }}</span>
                </div>
                <span aria-hidden="true" class="self-center text-3xl sm:text-5xl">{{ SUIT_SYMBOLS[card.suit] }}</span>
                <div aria-hidden="true" class="flex rotate-180 flex-col items-start leading-none">
                  <span class="text-lg font-bold sm:text-2xl">{{ card.rank }}</span>
                  <span class="mt-1 text-lg sm:text-xl">{{ SUIT_SYMBOLS[card.suit] }}</span>
                </div>
              </button>
            </div>
</template>
