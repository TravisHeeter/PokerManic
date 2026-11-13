<script setup lang="ts">
export const CARD_STYLES = [
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
const props = defineProps<{ cardStyle: string }>();
const emit = defineEmits<{ 'update:cardStyle': [style: string] }>();
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
  </section>
</template>
