<script setup lang="ts">
import { computed } from 'vue';
import type { Card } from '@pokermanic/contracts';
import type { CardModifier, CardModifierMap, RunPhase } from '@pokermanic/engine';
import { cardIdentity } from '@pokermanic/engine';

const props = defineProps<{
  modifiers: readonly { id: CardModifier; label: string; description: string; cost: number }[];
  selectedCards: Card[];
  selectedCount: number;
  cardModifiers: CardModifierMap;
  upgradeChips: number;
  phase: RunPhase;
}>();
const emit = defineEmits<{ purchase: [id: CardModifier] }>();
const target = computed(() => props.selectedCount === 1 ? props.selectedCards[0] : undefined);
const modified = computed(() => target.value ? props.cardModifiers[cardIdentity(target.value)] : undefined);
function canBuy(id: CardModifier): boolean {
  const definition = props.modifiers.find(item => item.id === id);
  return !!definition && props.phase === 'playing' && !!target.value
    && !modified.value && props.upgradeChips >= definition.cost;
}
</script>

<template>
  <section aria-labelledby="modifier-shop-heading" class="space-y-3 rounded-lg border border-default p-4">
    <h3 id="modifier-shop-heading" class="font-semibold">Card modifier shop</h3>
    <p class="text-sm text-muted">
      Select exactly one unmodified card to upgrade. Effects persist across rounds
      and deck recycling until you reset or transcend.
    </p>
    <p data-testid="modifier-target" class="text-sm font-medium">
      {{ target ? `${target.rank} of ${target.suit}` : 'Select exactly one card' }}
      {{ modified ? '(already modified)' : '' }}
    </p>
    <div class="grid gap-3 sm:grid-cols-2">
      <div v-for="item in modifiers" :key="item.id" class="rounded-lg border border-default p-3 space-y-2">
        <p class="font-semibold">{{ item.label }}</p>
        <p class="text-xs text-muted">{{ item.description }}</p>
        <UButton :data-testid="`buy-card-modifier-${item.id}`" size="sm"
          :disabled="!canBuy(item.id)" @click="emit('purchase', item.id)">
          Buy for {{ item.cost }} upgrade chips
        </UButton>
      </div>
    </div>
  </section>
</template>
