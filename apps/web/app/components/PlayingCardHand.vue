<script setup lang="ts">
import { computed } from 'vue';
import type { Card, CardSuit } from '@pokermanic/contracts';
import { sortHandForDisplay, cardIdentity, type HandSortMode, type CardModifierMap, type CardModifier } from '@pokermanic/engine';
const props = defineProps<{
  hand: Card[];
  cardModifiers: CardModifierMap;
  magicEffects: Record<string, { chips: number; mult: number; frozen: boolean }>;
  selectedIndexes: number[];
  scoringCardIndexes: number[];
  cardsPerPlay: number;
  maxCardsPerDiscard: number;
  round: number;
  handsPlayed: number;
  inRound: boolean;
  sortMode: HandSortMode;
  cardStyle: string;
  suitColors: 'themed' | 'standard';
  customSuitColors: Partial<Record<CardSuit, string>>;
}>();
const emit = defineEmits<{
  'toggle-card': [index: number];
  'update:sortMode': [mode: HandSortMode];
}>();
const displayedCards = computed(() => sortHandForDisplay(props.hand, props.sortMode));
// One fixed-width final grid column anchors the last card to the right edge;
// preceding narrow columns create an overlapping fan without clipping any card.
const handColumns = computed(() => displayedCards.value.length > 1
  ? `repeat(${displayedCards.value.length - 1}, minmax(0, 1fr)) var(--card-width)`
  : 'var(--card-width)');
const modifierBadges: Record<CardModifier, string> = {
  bonus: '+10', multiplier: '×1.5', gold: 'GOLD', echo: 'ECHO', growing: 'GROW',
  wild_suit: 'W-S', wild_rank: 'W-R', wild_full: 'W-★',
};
const SUIT_SYMBOLS: Record<CardSuit, string> = {
  hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠',
};
</script>

<template>

            <div role="group" aria-label="Sort cards" class="flex flex-wrap items-center gap-2">
              <UButton data-testid="sort-dealt" size="sm" color="neutral"
                :variant="props.sortMode === 'dealt' ? 'solid' : 'outline'"
                :aria-pressed="props.sortMode === 'dealt'" @click="emit('update:sortMode', 'dealt')">Dealt order</UButton>
              <UButton data-testid="sort-rank" size="sm" color="neutral"
                :variant="props.sortMode === 'rank' ? 'solid' : 'outline'"
                :aria-pressed="props.sortMode === 'rank'" @click="emit('update:sortMode', 'rank')">2</UButton>
              <UButton data-testid="sort-suit" size="sm" color="neutral"
                :variant="props.sortMode === 'suit' ? 'solid' : 'outline'"
                :aria-pressed="props.sortMode === 'suit'" @click="emit('update:sortMode', 'suit')">♠</UButton>
            </div>

            <div data-testid="card-hand" :data-card-style="props.cardStyle" :data-suit-colors="props.suitColors" aria-label="Current card hand"
              class="relative grid w-full items-start pt-4 [--card-width:clamp(5rem,23vw,9rem)] sm:[--card-width:clamp(6rem,12vw,9rem)]"
              :style="{ gridTemplateColumns: handColumns }">
              <button
                v-for="(entry, displayIndex) in displayedCards"
                type="button"
                :key="`${round}-${handsPlayed}-${entry.originalIndex}-${entry.card.suit}-${entry.card.rank}`"
                data-testid="playing-card"
                :aria-label="`${selectedIndexes.includes(entry.originalIndex) ? 'Deselect' : 'Select'} ${entry.card.rank} of ${entry.card.suit}`"
                :aria-pressed="selectedIndexes.includes(entry.originalIndex)"
                :disabled="!inRound || (selectedIndexes.length === Math.max(cardsPerPlay, maxCardsPerDiscard) && !selectedIndexes.includes(entry.originalIndex))"
                @click="emit('toggle-card', entry.originalIndex)"
                class="pm-card relative flex w-[var(--card-width)] aspect-[5/7] select-none flex-col justify-between rounded-xl border p-2 text-left shadow-lg shadow-black/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 disabled:cursor-not-allowed disabled:opacity-60 sm:p-3"
                :class="selectedIndexes.includes(entry.originalIndex) ? '-translate-y-3' : 'hover:-translate-y-1'"
                :data-suit="entry.card.suit"
                :style="{ ...(props.suitColors === 'themed' && props.customSuitColors[entry.card.suit] ? { color: props.customSuitColors[entry.card.suit] } : {}), zIndex: displayIndex + 1 }"
                :data-selected="selectedIndexes.includes(entry.originalIndex) ? 'true' : 'false'"
                :data-scoring-card="scoringCardIndexes.includes(entry.originalIndex) ? 'true' : 'false'"
                :data-frozen="magicEffects[cardIdentity(entry.card)]?.frozen ? 'true' : 'false'"
              >
                <span v-if="magicEffects[cardIdentity(entry.card)]" data-testid="card-magic-badge"
                  class="absolute bottom-2 left-1 z-20 rounded bg-sky-900 px-1 py-0.5 text-[10px] font-bold text-white shadow-sm sm:left-2"
                  :title="magicEffects[cardIdentity(entry.card)]?.frozen ? 'Frozen card' : 'Magical bonus'">
                  {{ magicEffects[cardIdentity(entry.card)]?.frozen ? '❄ ' : '' }}{{ magicEffects[cardIdentity(entry.card)]?.chips ? '+' + magicEffects[cardIdentity(entry.card)]?.chips + ' Chips ' : '' }}{{ magicEffects[cardIdentity(entry.card)]?.mult ? '+' + magicEffects[cardIdentity(entry.card)]?.mult + ' Mult' : '' }}
                </span>
                <span v-if="cardModifiers[cardIdentity(entry.card)]" aria-hidden="true"
                  data-testid="card-modifier-badge"
                  :data-card-modifier="cardModifiers[cardIdentity(entry.card)]"
                  class="pm-card-modifier-badge absolute bottom-2 left-1 z-20 rounded px-1 py-0.5 text-[10px] font-bold leading-none text-white shadow-sm sm:left-2"
                  :title="cardModifiers[cardIdentity(entry.card)]?.replaceAll('_', ' ')">
                  {{ modifierBadges[cardModifiers[cardIdentity(entry.card)]!] }}
                </span>
                <span v-if="selectedIndexes.includes(entry.originalIndex)"
                  aria-hidden="true" data-testid="selected-card-check"
                  class="pm-card-selected-check absolute right-1 top-1 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-sky-500 text-lg font-black leading-none text-slate-950 shadow-md shadow-black/50 sm:right-2 sm:top-2 sm:h-8 sm:w-8">✓</span>
                <span v-if="scoringCardIndexes.includes(entry.originalIndex)"
                  aria-hidden="true" class="pm-card-scoring-marker absolute bottom-2 right-2 z-20 rounded bg-amber-300 px-1.5 py-0.5 text-[10px] font-black uppercase leading-tight text-slate-950">Scores</span>
                <div class="relative z-10 flex flex-col items-start leading-none">
                  <span class="pm-card-rank text-lg font-bold sm:text-2xl">{{ entry.card.rank }}</span>
                  <span class="mt-1 text-lg sm:text-xl">{{ SUIT_SYMBOLS[entry.card.suit] }}</span>
                </div>
                <div aria-hidden="true" class="pm-card-center absolute inset-0 flex flex-col items-center justify-center leading-none pointer-events-none">
                  <span data-testid="card-center-suit" class="pm-card-center-suit text-4xl sm:text-6xl">{{ SUIT_SYMBOLS[entry.card.suit] }}</span>
                </div>
                <div aria-hidden="true" class="relative z-10 flex rotate-180 flex-col items-start leading-none">
                  <span class="text-lg font-bold sm:text-2xl">{{ entry.card.rank }}</span>
                  <span class="mt-1 text-lg sm:text-xl">{{ SUIT_SYMBOLS[entry.card.suit] }}</span>
                </div>
              </button>
            </div>
</template>
