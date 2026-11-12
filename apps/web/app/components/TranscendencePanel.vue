<script setup lang="ts">
import type { SavedProfile } from '@pokermanic/contracts';
import type { PermanentUpgradeId } from '@pokermanic/engine';
defineProps<{
  profile: SavedProfile;
  earnedPrestige: number;
  perks: readonly { id: PermanentUpgradeId; label: string; description: string; baseCost: number; maxLevel: number }[];
  prices: Record<string, number | null>;
}>();
const emit = defineEmits<{ transcend: []; purchase: [id: PermanentUpgradeId] }>();
</script>
<template>
  <section aria-labelledby="prestige-heading">
    <UCard>
      <div class="space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h2 id="prestige-heading" class="text-2xl font-bold">Transcendence</h2>
          <div class="rounded-lg border border-default p-3">
            <p class="text-xs text-muted">Prestige chips</p>
            <strong data-testid="prestige-balance" class="text-2xl">{{ profile.prestigeChips }}</strong>
          </div>
        </div>
        <p class="text-sm text-muted">
          Reset your run for permanent currency after at least two completed rounds.
          Current reward: {{ earnedPrestige }} prestige. Total transcendences: {{ profile.transcends }}.
        </p>
        <UButton data-testid="transcend-action" color="warning" :disabled="earnedPrestige === 0"
          @click="emit('transcend')">Transcend (+{{ earnedPrestige }} prestige)</UButton>
        <div class="space-y-3">
          <h3 class="font-semibold">Permanent shop unlocks</h3>
          <p class="text-xs text-muted">Unlock a perk here once using prestige chips, then buy its levels with upgrade chips during each run.</p>
          <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div v-for="perk in perks" :key="perk.id" class="space-y-2 rounded-lg border border-default p-3">
              <h4 class="font-semibold">{{ perk.label }}</h4>
              <p class="text-xs text-muted">{{ perk.description }}</p>
              <p class="text-xs text-muted">{{ profile.permanentLevels[perk.id] > 0 ? 'Unlocked permanently' : 'Locked' }}</p>
              <UButton size="sm" :data-testid="`permanent-${perk.id}`"
                :disabled="prices[perk.id] === null || profile.prestigeChips < (prices[perk.id] ?? Infinity)"
                @click="emit('purchase', perk.id)">
                {{ prices[perk.id] === null ? 'Unlocked' : `Unlock for ${prices[perk.id]} prestige` }}
              </UButton>
            </div>
          </div>
        </div>
      </div>
    </UCard>
  </section>
</template>
