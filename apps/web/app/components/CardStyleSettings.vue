<script setup lang="ts">
const CARD_STYLES = [
  { id: 'classic', label: 'Classic' },
  { id: 'victorian', label: 'Victorian' },
  { id: 'deco', label: 'Art Deco' },
  { id: 'cyber', label: 'Cyber' },
  { id: 'bold-victorian', label: 'Bold Victorian' },
  { id: 'vivid-gothic', label: 'Vivid Gothic' },
  { id: 'art-nouveau', label: 'Art Nouveau' },
  { id: 'cosmic-horror', label: 'Cosmic Horror' },
  { id: 'medieval-illuminated', label: 'Medieval Illuminated' },
] as const;
import { computed, ref } from 'vue';
import type { CardSuit } from '@pokermanic/contracts';

// Starter palette supplied by the player. Each preset is an independent choice.
const PALETTE = [
  { name: 'Red', hex: '#E63946' },
  { name: 'Blue', hex: '#1D3557' },
  { name: 'Yellow', hex: '#FFB703' },
  { name: 'Green', hex: '#2A9D8F' },
  { name: 'Electric Cyan', hex: '#00F5D4' },
  { name: 'Magenta', hex: '#F15BB5' },
  { name: 'Lime Green', hex: '#AACC00' },
  { name: 'Bright Orange', hex: '#FF6B35' },
  { name: 'Ruby Red', hex: '#9B2226' },
  { name: 'Sapphire Blue', hex: '#005F73' },
  { name: 'Emerald Green', hex: '#0A9396' },
  { name: 'Amber Gold', hex: '#EE9B00' },
  { name: 'Terracotta', hex: '#E07A5F' },
  { name: 'Sage Green', hex: '#81B29A' },
  { name: 'Mustard Yellow', hex: '#F2CC8F' },
  { name: 'Slate Blue', hex: '#3D405B' },
  { name: 'Coral Pink', hex: '#FF595E' },
  { name: 'Ocean Blue', hex: '#1982C4' },
  { name: 'Sunny Yellow', hex: '#FFCA3A' },
  { name: 'Deep Purple', hex: '#6A4C93' },
  { name: 'Soft Mint', hex: '#B8E0D2' },
  { name: 'Lavender', hex: '#D8BBFF' },
  { name: 'Peach', hex: '#FFD6A5' },
  { name: 'Charcoal', hex: '#333533' },
  { name: 'Golden Orange', hex: '#E69F00' },
  { name: 'Sky Blue', hex: '#56B4E9' },
  { name: 'Bluish Green', hex: '#009E73' },
  { name: 'Dusty Rose', hex: '#CC79A7' },
  { name: 'Midnight Blue', hex: '#14213D' },
  { name: 'Tangerine', hex: '#FCA311' },
  { name: 'Teal', hex: '#2EC4B6' },
  { name: 'Light Gray', hex: '#E5E5E5' },
] as const;
const SUITS = [
  { id: 'spades', symbol: '♠', name: 'Spades' },
  { id: 'hearts', symbol: '♥', name: 'Hearts' },
  { id: 'clubs', symbol: '♣', name: 'Clubs' },
  { id: 'diamonds', symbol: '♦', name: 'Diamonds' },
] as const;
const props = defineProps<{
  cardStyle: string;
  suitColors: 'themed' | 'standard';
  customSuitColors: Partial<Record<CardSuit, string>>;
}>();
const emit = defineEmits<{
  'update:cardStyle': [style: string];
  'update:suitColors': [value: 'themed' | 'standard'];
  'update:customSuitColors': [colors: Partial<Record<CardSuit, string>>];
}>();
const selectedSuit = ref<CardSuit>('spades');
const currentColor = computed(() => props.customSuitColors[selectedSuit.value]);
function chooseColor(hex: string) {
  emit('update:customSuitColors', { ...props.customSuitColors, [selectedSuit.value]: hex });
  if (props.suitColors !== 'themed') emit('update:suitColors', 'themed');
}
function resetSuit() {
  const next = { ...props.customSuitColors };
  delete next[selectedSuit.value];
  emit('update:customSuitColors', next);
}
function resetAll() {
  emit('update:customSuitColors', {});
}
function contrast(hex: string) {
  const r = Number.parseInt(hex.slice(1, 3), 16) / 255;
  const g = Number.parseInt(hex.slice(3, 5), 16) / 255;
  const b = Number.parseInt(hex.slice(5, 7), 16) / 255;
  const luminance = [r, g, b].map(c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return (0.2126 * luminance[0]! + 0.7152 * luminance[1]! + 0.0722 * luminance[2]!) > 0.38 ? '#171717' : '#ffffff';
}
</script>

<template>
  <section aria-labelledby="card-settings-heading" class="space-y-3">
    <h3 id="card-settings-heading" class="text-lg font-semibold">Card styles</h3>
    <p class="text-xs text-muted">Choose how playing cards look. Your choice is saved on this device.</p>
    <div role="group" aria-label="Card appearance" class="flex flex-wrap gap-2">
      <UButton v-for="style in CARD_STYLES" :key="style.id"
        :data-testid="`card-style-${style.id}`"
        size="sm" color="neutral"
        :variant="props.cardStyle === style.id ? 'solid' : 'outline'"
        :aria-pressed="props.cardStyle === style.id"
        @click="emit('update:cardStyle', style.id)">{{ style.label }}</UButton>
    </div>
    <div class="space-y-3 border-t border-default pt-3">
      <h3 class="text-lg font-semibold">Suit colors</h3>
      <p class="text-xs text-muted">Use each card style's existing colors or traditional red hearts and diamonds with black spades and clubs.</p>
      <div role="group" aria-label="Suit colors" class="flex flex-wrap gap-2">
        <UButton data-testid="suit-colors-themed" size="sm" color="neutral"
          :variant="props.suitColors === 'themed' ? 'solid' : 'outline'"
          :aria-pressed="props.suitColors === 'themed'"
          @click="emit('update:suitColors', 'themed')">Themed colors</UButton>
        <UButton data-testid="suit-colors-standard" size="sm" color="neutral"
          :variant="props.suitColors === 'standard' ? 'solid' : 'outline'"
          :aria-pressed="props.suitColors === 'standard'"
          @click="emit('update:suitColors', 'standard')">Standard red &amp; black</UButton>
      </div>
    </div>
    <div class="space-y-3 border-t border-default pt-3" data-testid="suit-palette-settings">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h3 class="text-lg font-semibold">Customize themed suit colors</h3>
        <UButton data-testid="reset-all-suit-colors" size="xs" color="neutral"
          variant="outline" :disabled="Object.keys(props.customSuitColors).length === 0"
          @click="resetAll">Reset all</UButton>
      </div>
      <p class="text-xs text-muted">Choose a suit, then select its color. Each suit can have a different color. Selecting a swatch turns on Themed colors.</p>
      <div class="grid grid-cols-4 gap-2" role="group" aria-label="Choose suit to customize">
        <button v-for="suit in SUITS" :key="suit.id" type="button"
          :data-testid="`custom-suit-${suit.id}`"
          :aria-pressed="selectedSuit === suit.id"
          :aria-label="`Customize ${suit.name}`"
          class="flex min-w-0 flex-col items-center gap-1 rounded-lg border px-1 py-2 text-xs transition-colors"
          :class="selectedSuit === suit.id ? 'border-primary bg-elevated ring-2 ring-primary' : 'border-default hover:bg-elevated'"
          @click="selectedSuit = suit.id">
          <span class="text-2xl leading-none" :style="{ color: props.customSuitColors[suit.id] ?? 'currentColor' }">{{ suit.symbol }}</span>
          <span>{{ suit.name }}</span>
          <span class="text-[10px] text-muted">{{ props.customSuitColors[suit.id] ?? 'Style default' }}</span>
        </button>
      </div>
      <div class="flex items-center gap-2">
        <p class="text-sm">Editing <strong>{{ SUITS.find(suit => suit.id === selectedSuit)?.name }}</strong>:
          <span class="text-muted">{{ currentColor ?? 'Style default' }}</span>
        </p>
        <UButton data-testid="reset-selected-suit-color" size="xs" color="neutral" variant="outline"
          :disabled="!currentColor" @click="resetSuit">Reset suit</UButton>
      </div>
      <div class="grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label="Suit color palette">
        <button v-for="color in PALETTE" :key="color.hex" type="button"
          :data-testid="`suit-palette-${color.hex.slice(1).toLowerCase()}`"
          :aria-label="`Set ${selectedSuit} to ${color.name} ${color.hex}`"
          :aria-pressed="currentColor === color.hex"
          class="min-h-14 rounded-lg border-2 px-2 py-2 text-center text-xs shadow-sm"
          :class="currentColor === color.hex ? 'border-white ring-2 ring-primary' : 'border-transparent'"
          :style="{ backgroundColor: color.hex, color: contrast(color.hex) }"
          @click="chooseColor(color.hex)">
          <span class="block font-semibold">{{ color.name }}</span>
          <span class="block font-mono text-[11px]">{{ color.hex }}</span>
        </button>
      </div>
    </div>
  </section>
</template>
