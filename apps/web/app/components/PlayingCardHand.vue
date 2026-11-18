<script setup lang="ts">
import { computed } from 'vue';
import type { Card, CardSuit } from '@pokermanic/contracts';
import { sortHandForDisplay, cardIdentity, type HandSortMode, type CardModifierMap } from '@pokermanic/engine';
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
  handLayout?: 'auto' | 'overlap' | 'separate';
  suitFont: string;
  suitColors: 'themed' | 'standard';
  customSuitColors: Partial<Record<CardSuit, string>>;
}>();
const emit = defineEmits<{
  'toggle-card': [index: number];
  'materia-drop': [id: number, tier: number, index: number];
  'update:sortMode': [mode: HandSortMode];
}>();
const displayedCards = computed(() => sortHandForDisplay(props.hand, props.sortMode));
// One fixed-width final grid column anchors the last card to the right edge;
// preceding narrow columns create an overlapping fan without clipping any card.
const overlapWidth = computed(() => `${1 + Math.max(0, displayedCards.value.length - 1) * 0.48}`);
const handColumns = computed(() => displayedCards.value.length > 1
  ? `repeat(${displayedCards.value.length - 1}, minmax(0, 1fr)) var(--card-width)`
  : 'var(--card-width)');
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

            <div data-testid="card-hand" :data-card-style="props.cardStyle" :data-suit-font="props.suitFont" :data-suit-colors="props.suitColors" aria-label="Current card hand"
              class="relative grid w-full items-start pt-4 [--card-width:clamp(5rem,23vw,9rem)] sm:[--card-width:clamp(6rem,12vw,9rem)]"
              :class="{ 'pm-hand-overlap': props.handLayout === 'overlap', 'pm-hand-separate': props.handLayout === 'separate' }"
              :style="{ gridTemplateColumns: props.handLayout === 'separate' ? 'repeat(' + displayedCards.length + ', var(--card-width))' : handColumns }">
              <PokerCard
                v-for="(entry, displayIndex) in displayedCards"
                :key="`${round}-${handsPlayed}-${entry.originalIndex}-${entry.card.suit}-${entry.card.rank}`"
                :card="entry.card"
                variant="hand"
                :selected="selectedIndexes.includes(entry.originalIndex)"
                :scoring="scoringCardIndexes.includes(entry.originalIndex)"
                :disabled="!inRound || (selectedIndexes.length === Math.max(cardsPerPlay, maxCardsPerDiscard) && !selectedIndexes.includes(entry.originalIndex))"
                :stack-index="displayIndex + 1"
                :materia-card-index="entry.originalIndex"
                :materia-drop-enabled="inRound"
                :custom-color="props.suitColors === 'themed' ? props.customSuitColors[entry.card.suit] : undefined"
                :magic-effect="magicEffects[cardIdentity(entry.card)]"
                :modifier="cardModifiers[cardIdentity(entry.card)]"
                @toggle="emit('toggle-card', entry.originalIndex)"
                @materia-drop="(id, tier) => emit('materia-drop', id, tier, entry.originalIndex)"
              />
            </div>
</template>

<style scoped>
.pm-hand-overlap { max-width: calc(var(--card-width) * v-bind(overlapWidth)); }
.pm-hand-separate { overflow-x: auto; padding-bottom: 0.75rem; column-gap: 0.375rem; }
</style>
