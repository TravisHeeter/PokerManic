<script setup lang="ts">
import { computed } from 'vue';
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
const priceFor = (id: RunUpgradeId) => upgradeCost(props.progress, id);
const canBuy = (id: RunUpgradeId) => {
  const cost = priceFor(id);
  return props.phase !== 'game_over' && cost !== null && props.progress.upgradeChips >= cost;
};
</script>

<template>
      <section aria-labelledby="shop-heading" class="space-y-3">
        <UCard>
          <div class="space-y-4">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div class="space-y-1">
                <p class="text-xs font-semibold uppercase tracking-widest text-amber-300">Milestone 5 · Run upgrades</p>
                <h2 id="shop-heading" class="text-2xl font-bold">Perk shop — always open</h2>
                <p class="text-sm text-muted">
                  Clear rounds to earn upgrade chips, then shop any time during an active run.
                  All purchases take effect immediately, including an additional drawn card, scoring hands, discards, limits, and Manual Selection. Scoring chips are never spent.
                </p>
              </div>
              <div class="rounded-lg border border-default p-3">
                <p class="text-xs text-muted">Upgrade chips available</p>
                <p data-testid="upgrade-chip-balance" class="text-2xl font-bold">{{ progress.upgradeChips }}</p>
              </div>
            </div>
            <p v-if="phase !== 'game_over'" data-testid="shop-open" class="text-sm text-green-400">
              Shop open throughout your run. Purchase any affordable upgrade whenever you like.
            </p>
            <p v-else data-testid="shop-ended" class="text-sm text-muted">
              This run has ended. The shop is still visible, but run-only perks cannot be purchased after defeat.
              Start a new run to play again.
            </p>
            <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div v-for="perk in perkCatalog" :key="perk.id" class="space-y-2 rounded-lg border border-default p-3">
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
        </UCard>
      </section>
</template>
