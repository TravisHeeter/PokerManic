<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { RunPhase, RunProgress, RoundRules, RunUpgradeId } from '@pokermanic/engine';
import { RUN_UPGRADES, upgradeCost, isRunUpgradeUnlocked } from '@pokermanic/engine';
import type { SavedProfile } from '@pokermanic/contracts';

const props = defineProps<{
  phase: RunPhase;
  progress: RunProgress;
  profile: SavedProfile;
  rules: RoundRules;
  nextRoundRules: RoundRules;
  manualSelectionAvailable: boolean;
}>();
const emit = defineEmits<{ 'buy-perk': [id: RunUpgradeId] }>();
const perkCatalog = RUN_UPGRADES;
type DockTab = 'perks' | 'modifiers' | 'hand' | 'transcendence' | 'god' | 'settings';
const activeTab = ref<DockTab | ''>('');
const handTabAvailable = computed(() => props.manualSelectionAvailable);
const tabs = computed(() => [
  { label: 'Perk shop', icon: 'i-lucide-shopping-bag', value: 'perks' },
  { label: 'Card modifiers', icon: 'i-lucide-sparkles', value: 'modifiers' },
  ...(handTabAvailable.value
    ? [{ label: 'Hand selection', icon: 'i-lucide-layers-3', value: 'hand' }]
    : []),
  { label: 'Transcendence', icon: 'i-lucide-orbit', value: 'transcendence' },
  // A Lucide skull keeps the God Mode icon stylistically consistent with the other tabs.
  { label: 'God Mode', icon: 'i-lucide-skull', value: 'god' },
  { label: 'Settings', icon: 'i-lucide-settings', value: 'settings' },
]);
function selectTab(value: string | number) {
  activeTab.value = value as DockTab;
}
watch(handTabAvailable, available => {
  if (!available && activeTab.value === 'hand') activeTab.value = '';
});
const priceFor = (id: RunUpgradeId) => upgradeCost(props.progress, id);
const unlocked = (id: RunUpgradeId) => isRunUpgradeUnlocked(props.profile, id);
const canBuy = (id: RunUpgradeId) => {
  const cost = priceFor(id);
  return unlocked(id) && props.phase !== 'game_over' && cost !== null && props.progress.upgradeChips >= cost;
};
</script>

<template>
  <section aria-label="Upgrade shops"
    data-testid="perk-shop-dock"
    class="fixed inset-x-0 bottom-0 z-50 border-t border-default bg-default shadow-2xl shadow-black/40"
    :class="activeTab ? 'h-[25dvh]' : ''">
    <div class="mx-auto max-w-6xl" :class="activeTab ? 'flex h-full min-h-0 flex-col' : ''">
      <div class="shrink-0 border-b border-default px-3 py-2 sm:px-6">
        <UTabs
          :model-value="activeTab"
          @update:model-value="selectTab"
          :items="tabs"
          :content="false"
          color="success"
          variant="pill"
          aria-label="Game controls"
          :ui="{
            list: 'justify-around w-full',
            trigger: 'grow min-w-0 flex-col gap-1 py-1 px-1',
            label: 'text-[10px]/3 text-center leading-tight'
          }"
          class="w-full"
        />
        <div class="flex justify-end items-center gap-2 px-2 pt-2">
          <span class="text-xs text-muted">Upgrade chips</span>
          <strong data-testid="upgrade-chip-balance" class="text-lg tabular-nums">{{ progress.upgradeChips }}</strong>
          <UButton v-if="activeTab" data-testid="close-dock" icon="i-lucide-x"
            color="neutral" variant="ghost" size="xs" aria-label="Close dock"
            @click="activeTab = ''" />
        </div>
      </div>
      <div id="perk-shop-content" role="tabpanel" aria-label="Perk shop"
        v-show="activeTab === 'perks'" data-testid="perk-shop-content"
        class="min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-default px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:px-6">
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
              <p v-if="!unlocked(perk.id)" class="text-xs text-amber-300">Locked — unlock with prestige chips</p>
              <UButton size="sm" :data-testid="`buy-${perk.id}`"
                :disabled="!canBuy(perk.id)" @click="emit('buy-perk', perk.id)">
                {{ !unlocked(perk.id) ? 'Prestige locked' : priceFor(perk.id) === null ? 'Max level' : `Buy for ${priceFor(perk.id)} upgrade chips` }}
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
      <div id="modifier-shop-content" role="tabpanel" aria-label="Card modifiers"
        v-show="activeTab === 'modifiers'" data-testid="modifier-shop-content"
        class="min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-default px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:px-6">
        <div class="space-y-4">
          <slot name="modifiers" />
        </div>
      </div>
      <div v-if="handTabAvailable" id="hand-shop-content" role="tabpanel" aria-label="Hand selection"
        v-show="activeTab === 'hand'" data-testid="hand-shop-content"
        class="min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-default px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:px-6">
        <div class="space-y-4">
          <slot name="hand" />
        </div>
      </div>
      <div id="transcendence-shop-content" role="tabpanel" aria-label="Transcendence"
        v-show="activeTab === 'transcendence'" data-testid="transcendence-shop-content"
        class="min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-default px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:px-6">
        <slot name="transcendence" />
      </div>
      <div id="god-mode-content" role="tabpanel" aria-label="God Mode"
        v-show="activeTab === 'god'" data-testid="god-mode-content"
        class="min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-default px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:px-6">
        <slot name="god" />
      </div>
      <div id="settings-content" role="tabpanel" aria-label="Settings"
        v-show="activeTab === 'settings'" data-testid="settings-content"
        class="min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-default px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:px-6">
        <slot name="settings" />
      </div>
    </div>
  </section>
</template>
