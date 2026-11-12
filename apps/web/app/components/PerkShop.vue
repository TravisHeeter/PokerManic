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
const expanded = ref(false);
type DockTab = 'perks' | 'modifiers' | 'hand';
const activeTab = ref<DockTab>('perks');
const handTabAvailable = computed(() => props.manualSelectionAvailable);
watch(handTabAvailable, available => {
  if (!available && activeTab.value === 'hand') {
    activeTab.value = 'perks';
    expanded.value = false;
  }
});
function selectTab(tab: DockTab) {
  if (tab === 'hand' && !handTabAvailable.value) return;
  if (expanded.value && activeTab.value === tab) {
    expanded.value = false;
  } else {
    activeTab.value = tab;
    expanded.value = true;
  }
}
const priceFor = (id: RunUpgradeId) => upgradeCost(props.progress, id);
const unlocked = (id: RunUpgradeId) => isRunUpgradeUnlocked(props.profile, id);
const canBuy = (id: RunUpgradeId) => {
  const cost = priceFor(id);
  return unlocked(id) && props.phase !== 'game_over' && cost !== null && props.progress.upgradeChips >= cost;
};
</script>

<template>
  <section aria-labelledby="shop-heading"
    data-testid="perk-shop-dock"
    class="fixed inset-x-0 bottom-0 z-50 border-t border-default bg-default shadow-2xl shadow-black/40">
    <div class="mx-auto max-w-6xl">
      <div class="flex flex-wrap items-stretch justify-between gap-2 border-b border-default px-3 py-2 sm:px-6">
        <div role="tablist" aria-label="Game controls" class="flex min-w-0 flex-wrap gap-2">
          <button type="button" id="perk-shop-toggle" role="tab" data-testid="perk-shop-toggle"
            :aria-selected="activeTab === 'perks'"
            :aria-expanded="expanded && activeTab === 'perks'" aria-controls="perk-shop-content"
            class="rounded-lg px-3 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-amber-300"
            :class="activeTab === 'perks' ? 'bg-elevated text-highlighted' : 'text-muted hover:bg-elevated'"
            @click="selectTab('perks')">
            <span id="shop-heading">Perk shop</span>
            <span class="ml-1 text-xs font-normal">{{ expanded && activeTab === 'perks' ? '▼ Hide' : '▲ Show' }} upgrades</span>
          </button>
          <button type="button" id="modifier-shop-toggle" role="tab" data-testid="modifier-shop-toggle"
            :aria-selected="activeTab === 'modifiers'"
            :aria-expanded="expanded && activeTab === 'modifiers'" aria-controls="modifier-shop-content"
            class="rounded-lg px-3 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-amber-300"
            :class="activeTab === 'modifiers' ? 'bg-elevated text-highlighted' : 'text-muted hover:bg-elevated'"
            @click="selectTab('modifiers')">
            Card modifiers
            <span class="ml-1 text-xs font-normal">{{ expanded && activeTab === 'modifiers' ? '▼ Hide' : '▲ Show' }}</span>
          </button>
          <button v-if="handTabAvailable" type="button" id="hand-shop-toggle" role="tab" data-testid="hand-shop-toggle"
            :aria-selected="activeTab === 'hand'"
            :aria-expanded="expanded && activeTab === 'hand'" aria-controls="hand-shop-content"
            class="rounded-lg px-3 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-amber-300"
            :class="activeTab === 'hand' ? 'bg-elevated text-highlighted' : 'text-muted hover:bg-elevated'"
            @click="selectTab('hand')">
            Hand selection
            <span class="ml-1 text-xs font-normal">{{ expanded && activeTab === 'hand' ? '▼ Hide' : '▲ Show' }}</span>
          </button>
        </div>
        <span class="flex shrink-0 items-center gap-2 px-2">
          <span class="text-xs text-muted">Upgrade chips</span>
          <strong data-testid="upgrade-chip-balance" class="text-lg tabular-nums">{{ progress.upgradeChips }}</strong>
        </span>
      </div>
      <div id="perk-shop-content" role="tabpanel" aria-labelledby="perk-shop-toggle"
        v-show="expanded && activeTab === 'perks'" data-testid="perk-shop-content"
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
      <div id="modifier-shop-content" role="tabpanel" aria-labelledby="modifier-shop-toggle"
        v-show="expanded && activeTab === 'modifiers'" data-testid="modifier-shop-content"
        class="max-h-[min(70dvh,38rem)] overflow-y-auto overscroll-contain border-t border-default px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:px-6">
        <div class="space-y-4">
          <slot name="modifiers" />
        </div>
      </div>
      <div v-if="handTabAvailable" id="hand-shop-content" role="tabpanel" aria-labelledby="hand-shop-toggle"
        v-show="expanded && activeTab === 'hand'" data-testid="hand-shop-content"
        class="max-h-[min(70dvh,38rem)] overflow-y-auto overscroll-contain border-t border-default px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:px-6">
        <div class="space-y-4">
          <slot name="hand" />
        </div>
      </div>
    </div>
  </section>
</template>
