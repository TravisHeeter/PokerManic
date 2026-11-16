<script setup lang="ts">
import { computed, ref } from 'vue';
import type { Card, CardSuit } from '@pokermanic/contracts';
import { cardIdentity, type CardModifier } from '@pokermanic/engine';

const props = withDefaults(defineProps<{
  card: Card;
  variant?: 'hand' | 'preview';
  selected?: boolean;
  scoring?: boolean;
  disabled?: boolean;
  stackIndex?: number;
  materiaCardIndex?: number;
  materiaDropEnabled?: boolean;
  customColor?: string;
  magicEffect?: { chips: number; mult: number; frozen: boolean } | null;
  modifier?: CardModifier | null;
}>(), {
  variant: 'hand',
  selected: false,
  scoring: false,
  disabled: false,
  stackIndex: 1,
  magicEffect: null,
  modifier: null,
});
const dragHover = ref(false);
function dragOver(event: DragEvent) {
  if (props.variant !== 'hand' || !props.materiaDropEnabled || !event.dataTransfer?.types.includes('application/x-pokermanic-materia')) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = 'copy';
  dragHover.value = true;
}
function dragLeave(event: DragEvent) {
  if (!(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node | null)) dragHover.value = false;
}
const emit = defineEmits<{ toggle: []; 'materia-drop': [id: number] }>();
function dropMateria(event: DragEvent) {
  dragHover.value = false;
  if (props.variant !== 'hand' || !props.materiaDropEnabled) return;
  const value = event.dataTransfer?.getData('application/x-pokermanic-materia');
  if (!value) return;
  const id = Number(value);
  if (Number.isInteger(id) && id > 0) emit('materia-drop', id);
}
const SUIT_SYMBOLS: Record<CardSuit, string> = {
  hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠',
};
const modifierBadges: Record<CardModifier, string> = {
  bonus: '+10', multiplier: '×1.5', gold: 'GOLD', echo: 'ECHO', growing: 'GROW',
  wild_suit: 'W-S', wild_rank: 'W-R', wild_full: 'W-★',
};
const symbol = computed(() => SUIT_SYMBOLS[props.card.suit]);
const cardKey = computed(() => cardIdentity(props.card));
const title = computed(() => `${props.card.rank} of ${props.card.suit}`);
</script>

<template>
  <component
    :is="variant === 'hand' ? 'button' : 'div'"
    :type="variant === 'hand' ? 'button' : undefined"
    class="pm-card relative aspect-[5/7] select-none rounded-xl border text-left shadow-lg shadow-black/30"
    :class="
    variant === 'hand'
      ? ['w-[var(--card-width)]', selected ? '-translate-y-3' : 'hover:-translate-y-1',
         'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 disabled:cursor-not-allowed disabled:opacity-60']
      : 'w-full min-w-0'
    "
    :data-testid="variant === 'hand' ? 'playing-card' : `preview-ace-${card.suit}`"
    :data-suit="card.suit"
    :data-materia-card-index="variant === 'hand' ? materiaCardIndex : undefined"
    :data-selected="variant === 'hand' && selected ? 'true' : 'false'"
    :data-scoring-card="variant === 'hand' && scoring ? 'true' : 'false'"
    :data-frozen="magicEffect?.frozen ? 'true' : 'false'"
    :data-materia-drop-hover="dragHover ? 'true' : undefined"
    :aria-label="variant === 'hand' ? `${selected ? 'Deselect' : 'Select'} ${title}` : title"
    :aria-pressed="variant === 'hand' ? selected : undefined"
    :disabled="variant === 'hand' ? disabled : undefined"
    :style="{ ...(customColor ? { color: customColor } : {}), zIndex: dragHover ? 100 : stackIndex }"
    @click="variant === 'hand' && emit('toggle')"
    @dragover="dragOver"
    @dragleave="dragLeave"
    @drop.prevent="dropMateria"
  >
    <span v-if="variant === 'hand' && magicEffect" data-testid="card-magic-badge"
      class="absolute bottom-2 left-1 z-20 rounded bg-sky-900 px-1 py-0.5 text-[10px] font-bold text-white shadow-sm sm:left-2"
      :title="magicEffect.frozen ? 'Frozen card' : 'Magical bonus'">
      {{ magicEffect.frozen ? '❄ ' : '' }}{{ magicEffect.chips ? '+' + magicEffect.chips + ' Chips ' : '' }}{{ magicEffect.mult ? '+' + magicEffect.mult + ' Mult' : '' }}
    </span>
    <span v-if="variant === 'hand' && modifier" aria-hidden="true"
      data-testid="card-modifier-badge" :data-card-modifier="modifier"
      class="pm-card-modifier-badge absolute bottom-2 left-1 z-20 rounded px-1 py-0.5 text-[10px] font-bold leading-none text-white shadow-sm sm:left-2"
      :title="modifier.replaceAll('_', ' ')">
      {{ modifierBadges[modifier] }}
    </span>

    <!-- A single centered index layout serves every playable and preview card. -->
    <div class="pm-card-corner pm-card-corner-top" aria-hidden="true">
      <span class="pm-card-rank pm-card-corner-rank">{{ card.rank }}</span>
      <span class="pm-card-suit pm-card-corner-suit">{{ symbol }}</span>
    </div>
    <div aria-hidden="true" class="pm-card-center pointer-events-none absolute inset-0 flex items-center justify-center">
      <span data-testid="card-center-suit" class="pm-card-center-suit text-3xl sm:text-6xl">{{ symbol }}</span>
    </div>
    <div class="pm-card-corner pm-card-corner-bottom" aria-hidden="true">
      <span class="pm-card-rank pm-card-corner-rank">{{ card.rank }}</span>
      <span class="pm-card-suit pm-card-corner-suit">{{ symbol }}</span>
    </div>
  </component>
</template>

<style scoped>
.pm-card[data-materia-hover="true"] {
  z-index: 100 !important;
  outline: 4px solid #fcd34d;
  outline-offset: 2px;
  filter: brightness(1.22);
  box-shadow: 0 0 28px rgba(251,191,36,.9);
}
</style>
