<script setup lang="ts">
import { ref } from 'vue';
import type { RunPhase, RunProgress, RoundRules, RunUpgradeId } from '@pokermanic/engine';
import { RUN_UPGRADES, upgradeCost } from '@pokermanic/engine';

const props = defineProps<{
  phase: RunPhase;
  progress: RunProgress;
  rules: RoundRules;
  nextRoundRules: RoundRules;
}>();
const emit = defineEmits<{ 'buy-perk': [id: RunUpgradeId] }>();
const perkCatalog = RUN_UPGRADES;
const expanded = ref(false);
const priceFor = (id: RunUpgradeId) => upgradeCost(props.progress, id);
const canBuy = (id: RunUpgradeId) => {
  const cost = priceFor(id);
  return props.phase !== 'game_over' && cost !== null && props.progress.upgradeChips >= cost;
};
</script>

<template>
  <section aria-labelledby="shop-heading"
    data-testid="perk-shop-dock"
    class="fixed inset-x-0 bottom-0 z-50 border-t border-default bg-default shadow-2xl shadow-black/40">
    <div class="mx-auto max-w-6xl">
      <button type="button" data-testid="perk-shop-toggle"
        class="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-elevated focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-amber-300 sm:px-6"
        :aria-expanded="expanded" aria-controls="perk-shop-content"
        @click="expanded = !expanded">
        <span class="flex items-center gap-3">
          <span class="rounded-md border border-default px-2 py-1 text-xs text-muted">
            {{ expanded ? '▼' : '▲' }}
          </span>
          <span id="shop-heading" class="font-bold">Perk shop</span>
          <span class="text-xs text-muted">{{ expanded ? 'Hide' : 'Show' }} upgrades</span>
        </span>
        <span class="flex items-center gap-2">
          <span class="text-xs text-muted">Upgrade chips</span>
          <strong data-testid="upgrade-chip-balance" class="text-lg tabular-nums">{{ progress.upgradeChips }}</strong>
        </span>
      </button>
      <div id="perk-shop-content" v-show="expanded" data-testid="perk-shop-content"
        class="max-h-[min(70dvh,38rem)] overflow-y-auto overscroll-contain border-t border-default px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:px-6">
        <div class="space-y-4">
          <p v-if="phase !== 'game_over'" data-testid="shop-open" class="text-sm text-green-400">
            Shop open throughout your run. Purchase any affordable upgrade whenever you like.
          </p>
          <p v-else data-testid="shop-ended" class="text-sm text-muted">
            This run has ended. The shop remains viewable, but perks cannot be bought after defeat.
          </p>
          <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div v-for="perk in perkCatalog" :key="perk.id"
              class="space-y-2 rounded-lg border border-default p-3">
              <h3 class="font-semibold">{{ perk.label }}</h3>
              <p class="text-xs text-muted">{{ perk.description }}</p>
              <p class="text-xs text-muted">Level {{ progress.levels[perk.id] }} / {{ perk.maxLevel }}</p>
              <UButton size="sm" :data-testid="`buy-${perk.id}`"
                :disabled="!canBuy(perk.id)" @click="emit('buy-perk', perk.id)">
                {{ priceFor(perk.id) === null ? 'Max level' : `Buy for ${priceFor(perk.id)} upgrade chips` }}
              </UButton>
            </div>
          </div>
          <p class="text-xs text-muted">
            Active limits: {{ rules.handSize }} held cards, up to {{ rules.cardsPerPlay }} cards per play,
            {{ rules.maxCardsPerDiscard }} cards per discard, {{ rules.baseHandsPerRound }} base hands,
            and {{ rules.baseDiscardsPerRound }} base discards. Purchases apply immediately.
            Run upgrades reset on a new run.
          </p>
        </div>
      </div>
    </div>
  </section>
</template>
