<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
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
  sortMode: HandSortMode;
}>();
const emit = defineEmits<{
  'toggle-card': [index: number];
  'update:sortMode': [mode: HandSortMode];
}>();
const displayedCards = computed(() => sortHandForDisplay(props.hand, props.sortMode));
const SUIT_SYMBOLS: Record<CardSuit, string> = {
  hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠',
};
type CardStyle = 'classic' | 'victorian' | 'deco' | 'cyber'
  | 'bold-victorian' | 'vivid-gothic' | 'art-nouveau'
  | 'cosmic-horror' | 'medieval-illuminated';
const STYLE_STORAGE_KEY = 'pokermanic.card-style.v1';
const cardStyle = ref<CardStyle>('classic');
const styles: { id: CardStyle; label: string }[] = [
  { id: 'classic', label: 'Classic' },
  { id: 'victorian', label: 'Victorian' },
  { id: 'deco', label: 'Art Deco' },
  { id: 'cyber', label: 'Cyber' },
  { id: 'bold-victorian', label: 'Bold Victorian' },
  { id: 'vivid-gothic', label: 'Vivid Gothic' },
  { id: 'art-nouveau', label: 'Art Nouveau' },
  { id: 'cosmic-horror', label: 'Cosmic Horror' },
  { id: 'medieval-illuminated', label: 'Medieval Illuminated' },
];
onMounted(() => {
  try {
    const saved = localStorage.getItem(STYLE_STORAGE_KEY);
    if (styles.some(style => style.id === saved)) cardStyle.value = saved as CardStyle;
  } catch { /* Browser storage may be blocked; the Classic style still works. */ }
});
watch(cardStyle, value => {
  try { localStorage.setItem(STYLE_STORAGE_KEY, value); } catch { /* Optional preference. */ }
});
</script>

<template>
            <p class="text-sm text-muted">
              Choose 1 to {{ cardsPerPlay }} cards to score, or select up to {{ maxCardsPerDiscard }} to discard.
              The game scores the strongest qualifying hand automatically
              until the Manual Hand Selection perk is unlocked.
              <strong data-testid="selected-count" class="text-highlighted">{{ selectedIndexes.length }} selected · 1–{{ cardsPerPlay }} to score</strong>
            </p>

            <div role="group" aria-label="Sort cards" class="flex flex-wrap items-center gap-2">
              <span class="text-sm text-muted">Sort cards:</span>
              <UButton data-testid="sort-dealt" size="sm" color="neutral"
                :variant="props.sortMode === 'dealt' ? 'solid' : 'outline'"
                :aria-pressed="props.sortMode === 'dealt'" @click="emit('update:sortMode', 'dealt')">Dealt order</UButton>
              <UButton data-testid="sort-rank" size="sm" color="neutral"
                :variant="props.sortMode === 'rank' ? 'solid' : 'outline'"
                :aria-pressed="props.sortMode === 'rank'" @click="emit('update:sortMode', 'rank')">Rank</UButton>
              <UButton data-testid="sort-suit" size="sm" color="neutral"
                :variant="props.sortMode === 'suit' ? 'solid' : 'outline'"
                :aria-pressed="props.sortMode === 'suit'" @click="emit('update:sortMode', 'suit')">Suit</UButton>
              <span class="text-xs text-muted">Highest first · suits ♠ ♥ ♦ ♣</span>
            </div>

            <div role="group" aria-label="Card appearance" class="flex flex-wrap items-center gap-2">
              <span class="text-sm text-muted">Card style:</span>
              <UButton v-for="style in styles" :key="style.id"
                :data-testid="`card-style-${style.id}`"
                size="sm" color="neutral"
                :variant="cardStyle === style.id ? 'solid' : 'outline'"
                :aria-pressed="cardStyle === style.id"
                @click="cardStyle = style.id">{{ style.label }}</UButton>
            </div>

            <div data-testid="card-hand" :data-card-style="cardStyle" aria-label="Current card hand" class="grid grid-cols-4 gap-2 sm:grid-cols-8 sm:gap-3">
              <button
                v-for="entry in displayedCards"
                type="button"
                :key="`${round}-${handsPlayed}-${entry.originalIndex}-${entry.card.suit}-${entry.card.rank}`"
                data-testid="playing-card"
                :aria-label="`${selectedIndexes.includes(entry.originalIndex) ? 'Deselect' : 'Select'} ${entry.card.rank} of ${entry.card.suit}`"
                :aria-pressed="selectedIndexes.includes(entry.originalIndex)"
                :disabled="!inRound || (selectedIndexes.length === Math.max(cardsPerPlay, maxCardsPerDiscard) && !selectedIndexes.includes(entry.originalIndex))"
                @click="emit('toggle-card', entry.originalIndex)"
                class="pm-card relative flex aspect-[5/7] select-none flex-col justify-between rounded-xl border p-2 text-left shadow-lg shadow-black/30 transition-all hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 disabled:cursor-not-allowed disabled:opacity-60 sm:p-3"
                :data-suit="entry.card.suit"
                :data-scoring-card="scoringCardIndexes.includes(entry.originalIndex) ? 'true' : 'false'"
                :class="[
                  scoringCardIndexes.includes(entry.originalIndex) ? '-translate-y-2 ring-4 ring-amber-300' :
                    selectedIndexes.includes(entry.originalIndex) ? '-translate-y-1 ring-2 ring-sky-500' : '',
                ]"
              >
                <div class="relative z-10 flex flex-col items-start leading-none">
                  <span class="pm-card-rank text-lg font-bold sm:text-2xl">{{ entry.card.rank }}</span>
                  <span class="mt-1 text-lg sm:text-xl">{{ SUIT_SYMBOLS[entry.card.suit] }}</span>
                </div>
                <div aria-hidden="true" class="pm-card-center absolute inset-0 flex flex-col items-center justify-center leading-none pointer-events-none">
                  <span data-testid="card-center-rank" class="pm-card-center-rank text-4xl font-bold sm:text-6xl">{{ entry.card.rank }}</span>
                  <span data-testid="card-center-suit" class="pm-card-center-suit text-4xl sm:text-6xl">{{ SUIT_SYMBOLS[entry.card.suit] }}</span>
                </div>
                <div aria-hidden="true" class="relative z-10 flex rotate-180 flex-col items-start leading-none">
                  <span class="text-lg font-bold sm:text-2xl">{{ entry.card.rank }}</span>
                  <span class="mt-1 text-lg sm:text-xl">{{ SUIT_SYMBOLS[entry.card.suit] }}</span>
                </div>
              </button>
            </div>
</template>
