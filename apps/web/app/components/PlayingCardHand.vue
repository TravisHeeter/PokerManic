<script setup lang="ts">
import { computed, ref } from 'vue';
import type { Card, CardSuit } from '@pokermanic/contracts';
import { sortHandForDisplay, type HandSortMode } from '@pokermanic/engine';
const props = defineProps<{
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
const sortMode = ref<HandSortMode>('dealt');
const displayedCards = computed(() => sortHandForDisplay(props.hand, sortMode.value));
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

            <div role="group" aria-label="Sort cards" class="flex flex-wrap items-center gap-2">
              <span class="text-sm text-muted">Sort cards:</span>
              <UButton data-testid="sort-dealt" size="sm" color="neutral"
                :variant="sortMode === 'dealt' ? 'solid' : 'outline'"
                :aria-pressed="sortMode === 'dealt'" @click="sortMode = 'dealt'">Dealt order</UButton>
              <UButton data-testid="sort-rank" size="sm" color="neutral"
                :variant="sortMode === 'rank' ? 'solid' : 'outline'"
                :aria-pressed="sortMode === 'rank'" @click="sortMode = 'rank'">Rank</UButton>
              <UButton data-testid="sort-suit" size="sm" color="neutral"
                :variant="sortMode === 'suit' ? 'solid' : 'outline'"
                :aria-pressed="sortMode === 'suit'" @click="sortMode = 'suit'">Suit</UButton>
              <span class="text-xs text-muted">Highest first · suits ♠ ♥ ♦ ♣</span>
            </div>

            <div data-testid="card-hand" aria-label="Current card hand" class="grid grid-cols-4 gap-2 sm:grid-cols-8 sm:gap-3">
              <button
                v-for="entry in displayedCards"
                type="button"
                :key="`${round}-${handsPlayed}-${entry.originalIndex}-${entry.card.suit}-${entry.card.rank}`"
                data-testid="playing-card"
                :aria-label="`${selectedIndexes.includes(entry.originalIndex) ? 'Deselect' : 'Select'} ${entry.card.rank} of ${entry.card.suit}`"
                :aria-pressed="selectedIndexes.includes(entry.originalIndex)"
                :disabled="!inRound || (selectedIndexes.length === Math.max(cardsPerPlay, maxCardsPerDiscard) && !selectedIndexes.includes(entry.originalIndex))"
                @click="emit('toggle-card', entry.originalIndex)"
                class="relative flex aspect-[5/7] select-none flex-col justify-between rounded-xl border border-slate-200 bg-[#faf8f1] p-2 text-left shadow-lg shadow-black/30 transition-all hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 disabled:cursor-not-allowed disabled:opacity-60 sm:p-3"
                :data-scoring-card="scoringCardIndexes.includes(entry.originalIndex) ? 'true' : 'false'"
                :class="[
                  SUIT_TEXT[entry.card.suit],
                  scoringCardIndexes.includes(entry.originalIndex) ? '-translate-y-2 ring-4 ring-amber-300' :
                    selectedIndexes.includes(entry.originalIndex) ? '-translate-y-1 ring-2 ring-sky-500' : '',
                ]"
              >
                <div class="flex flex-col items-start leading-none">
                  <span class="text-lg font-bold sm:text-2xl">{{ entry.card.rank }}</span>
                  <span class="mt-1 text-lg sm:text-xl">{{ SUIT_SYMBOLS[entry.card.suit] }}</span>
                </div>
                <span aria-hidden="true" class="self-center text-3xl sm:text-5xl">{{ SUIT_SYMBOLS[entry.card.suit] }}</span>
                <div aria-hidden="true" class="flex rotate-180 flex-col items-start leading-none">
                  <span class="text-lg font-bold sm:text-2xl">{{ entry.card.rank }}</span>
                  <span class="mt-1 text-lg sm:text-xl">{{ SUIT_SYMBOLS[entry.card.suit] }}</span>
                </div>
              </button>
            </div>
</template>
