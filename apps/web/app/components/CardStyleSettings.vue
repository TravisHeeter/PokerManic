<script setup lang="ts">
import { SUIT_PALETTES, type SuitPaletteId } from '~/utils/suitPalettes';

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
const props = defineProps<{
  cardStyle: string;
  suitColors: 'themed' | 'standard';
  selectedPalette: SuitPaletteId | null;
}>();
const emit = defineEmits<{
  'update:cardStyle': [style: string];
  'update:suitColors': [value: 'themed' | 'standard'];
  'update:selectedPalette': [value: SuitPaletteId | null];
}>();

const SUIT_ORDER = [
  { id: 'hearts', symbol: '♥' },
  { id: 'spades', symbol: '♠' },
  { id: 'diamonds', symbol: '♦' },
  { id: 'clubs', symbol: '♣' },
] as const;

function choosePalette(id: SuitPaletteId | null) {
  emit('update:selectedPalette', id);
  if (props.suitColors !== 'themed') emit('update:suitColors', 'themed');
}
function contrast(hex: string) {
  const channels = [1, 3, 5].map(i => Number.parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map(c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return (0.2126 * r! + 0.7152 * g! + 0.0722 * b!) > 0.38 ? '#171717' : '#ffffff';
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
      <p class="text-xs text-muted">Use each card style's original colors, one complete preset palette, or traditional red and black.</p>
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
      <h3 class="text-lg font-semibold">Themed color palettes</h3>
      <p class="text-xs text-muted">Select an entire row of four suit colors. Individual colors cannot be mixed between rows.</p>
      <div role="radiogroup" aria-label="Themed suit palette" class="space-y-2">
        <label data-testid="suit-palette-original"
          class="flex cursor-pointer items-center gap-3 rounded-lg border border-default p-3 hover:bg-elevated">
          <input type="radio" name="suit-palette" value="original"
            :checked="props.selectedPalette === null" @change="choosePalette(null)" />
          <span class="text-sm font-medium">Original card-style colors</span>
        </label>
        <label v-for="palette in SUIT_PALETTES" :key="palette.id"
          :data-testid="`suit-palette-row-${palette.id}`"
          class="flex cursor-pointer items-center gap-2 rounded-lg border p-2 transition-colors"
          :class="props.selectedPalette === palette.id ? 'border-primary ring-2 ring-primary' : 'border-default hover:bg-elevated'">
          <input type="radio" name="suit-palette" :value="palette.id"
            :checked="props.selectedPalette === palette.id"
            :aria-label="palette.name"
            @change="choosePalette(palette.id)" />
          <span class="grid min-w-0 flex-1 grid-cols-4 gap-1">
            <span v-for="suit in SUIT_ORDER" :key="suit.id"
              class="flex min-h-12 min-w-0 flex-col items-center justify-center rounded-md px-1 py-1 text-center"
              :style="{ backgroundColor: palette.colors[suit.id], color: contrast(palette.colors[suit.id]) }">
              <span class="text-lg leading-none">{{ suit.symbol }}</span>
              <span class="font-mono text-[9px] leading-tight sm:text-[11px]">{{ palette.colors[suit.id] }}</span>
            </span>
          </span>
          <span class="sr-only">{{ palette.name }}</span>
        </label>
      </div>
    </div>
  </section>
</template>
