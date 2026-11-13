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
const props = defineProps<{ cardStyle: string; suitColors: 'themed' | 'standard' }>();
const emit = defineEmits<{ 'update:cardStyle': [style: string]; 'update:suitColors': [value: 'themed' | 'standard'] }>();
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
  </section>
</template>
