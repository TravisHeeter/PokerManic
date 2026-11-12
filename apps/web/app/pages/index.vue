<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { GAME_SAVE_STORAGE_KEY, formatGameSave, parseGameSave } from '@pokermanic/contracts';
import type { GameSaveV1, SavedProfile } from '@pokermanic/contracts';
import {
  DEFAULT_ROUND_RULES,
  advanceRound,
  applyRunUpgrades,
  applyPurchasedRuleUpgrade,
  awardRoundUpgradeChips,
  createRunProgress,
  discardCards,
  listEligiblePokerHands,
  playScoringHand,
  purchaseRunUpgrade,
  resolveScoringOption,
  startRun,
  manualSelectionUnlocked,
  createPermanentProgress, startingUpgradeChips,
  transcendReward, transcendRun, PERMANENT_UPGRADES,
  permanentUpgradeCost, buyPermanentUpgrade,
} from '@pokermanic/engine';
import type { RunState, ScoringOption, RunUpgradeId, RunProgress, HandSortMode, PermanentUpgradeId } from '@pokermanic/engine';

useSeoMeta({
  title: 'PokerManic | Milestone 7 — Transcendence',
  description: 'Earn permanent prestige perks that survive every run.',
});

const progress = ref<RunProgress>(createRunProgress());
const profile = ref<SavedProfile>({ lifetimeRunsStarted: 1, bestRound: 1, ...createPermanentProgress() });
const sortMode = ref<HandSortMode>('rank');
const hydrated = ref(false);
const savingBlocked = ref(false);
const saveStatus = ref('Loading browser save…');
const saveJson = ref('');
const saveJsonDirty = ref(false);
function updateSaveJson(value: string) {
  saveJson.value = value;
  saveJsonDirty.value = true;
}
// Effective rules update as perks are purchased, without resetting the round.

const rules = ref({ ...DEFAULT_ROUND_RULES });
// Keep active run rules stable when prestige perks are bought mid-run.
const nextRoundRules = computed(() => rules.value);
function activeRunBaseRules() {
  const levels = progress.value.levels;
  return {
    ...rules.value,
    handSize: rules.value.handSize - levels.hand_size,
    cardsPerPlay: rules.value.cardsPerPlay - levels.cards_per_play,
    maxCardsPerDiscard: rules.value.maxCardsPerDiscard - levels.discard_batch,
    baseHandsPerRound: rules.value.baseHandsPerRound - levels.extra_hand,
    baseDiscardsPerRound: rules.value.baseDiscardsPerRound - levels.extra_discard,
  };
}

// Nuxt useState serializes the randomly dealt opening run into the SSR payload.
// The browser hydrates that exact run instead of shuffling a second time.
const run = useState<RunState>('pokermanic-opening-run', () => startRun(DEFAULT_ROUND_RULES));
const hand = computed(() => run.value.hand);
const remainingDeck = computed(() => run.value.drawPile);
const inRound = computed(() => run.value.phase === 'playing');
const selectedIndexes = ref<number[]>([]);
const selectedInputIndexes = computed(() => hand.value.flatMap((_, i) =>
  selectedIndexes.value.includes(i) ? [i] : []));
const selectedCards = computed(() => selectedInputIndexes.value.map((i) => hand.value[i]!));
const eligibleOptions = computed(() => selectedCards.value.length >= 1
  && selectedCards.value.length <= rules.value.cardsPerPlay
  ? listEligiblePokerHands(selectedCards.value) : []);

const manualUnlocked = computed(() => manualSelectionUnlocked(progress.value));
const selectionMode = ref<'automatic' | 'manual'>('automatic');
const manualOptionId = ref<string>();
const preview = computed(() => resolveScoringOption(eligibleOptions.value, {
  manualSelectionUnlocked: manualUnlocked.value,
  selectionMode: selectionMode.value,
}, manualOptionId.value));
const scoringCardIndexes = computed(() => preview.value?.scoringCardIndices
  .map((i) => selectedInputIndexes.value[i]!) ?? []);
const scoredHand = ref<ScoringOption | null>(null);
const lastAction = ref('Run started. Earn upgrade chips by clearing rounds. The perk shop is always open.');
const canDiscardSelection = computed(() => inRound.value
  && run.value.discardsRemaining > 0
  && selectedIndexes.value.length >= 1
  && selectedIndexes.value.length <= rules.value.maxCardsPerDiscard);

function clearSelection() {
  selectedIndexes.value = [];
  manualOptionId.value = undefined;
  scoredHand.value = null;
}

function setSelectionMode(mode: 'automatic' | 'manual') {
  if (mode === 'manual' && !manualUnlocked.value) return;
  selectionMode.value = mode;
  scoredHand.value = null;
}

function chooseScoringOption(optionId: string) {
  if (!manualUnlocked.value || selectionMode.value !== 'manual') return;
  manualOptionId.value = optionId;
  scoredHand.value = null;
}

function toggleCard(index: number) {
  if (!inRound.value) return;
  if (selectedIndexes.value.includes(index)) {
    selectedIndexes.value = selectedIndexes.value.filter((value) => value !== index);
  } else if (selectedIndexes.value.length < Math.max(rules.value.cardsPerPlay, rules.value.maxCardsPerDiscard)) {
    selectedIndexes.value = [...selectedIndexes.value, index];
  }
  manualOptionId.value = undefined;
  scoredHand.value = null;
}

function scoreSelectedHand() {
  if (!preview.value || !inRound.value) return;
  const next = playScoringHand(run.value, selectedInputIndexes.value, {
    manualSelectionUnlocked: manualUnlocked.value,
    selectionMode: selectionMode.value,
  }, manualOptionId.value, rules.value);
  const scored = next.lastScored;
  run.value = next;
  if (next.phase === 'round_won') {
    progress.value = awardRoundUpgradeChips(next, progress.value);
  }
  clearSelection();
  scoredHand.value = scored;
  lastAction.value = scored
    ? `Scored ${scored.label}: +${scored.score} chips. ${next.roundChips} / ${next.roundTarget} this round.`
    : 'Hand scored.';
}

function discardSelectedCards() {
  if (!canDiscardSelection.value) return;
  const count = selectedIndexes.value.length;
  run.value = discardCards(run.value, selectedIndexes.value, rules.value);
  clearSelection();
  lastAction.value = `Discarded ${count} ${count === 1 ? 'card' : 'cards'} and drew replacements.`;
}

function nextRound() {
  if (run.value.phase !== 'round_won') return;
  rules.value = nextRoundRules.value;
  run.value = advanceRound(run.value, rules.value);
  clearSelection();
  lastAction.value = `Round ${run.value.round} started. Reach ${run.value.roundTarget} chips to survive.`;
}

function resetToFreshRun() {
  profile.value = {
    ...profile.value,
    lifetimeRunsStarted: profile.value.lifetimeRunsStarted + 1,
    bestRound: Math.max(profile.value.bestRound, run.value.round),
  };
  savingBlocked.value = false;
  saveJsonDirty.value = false;
  progress.value = { ...createRunProgress(), upgradeChips: startingUpgradeChips(profile.value) };
  rules.value = { ...DEFAULT_ROUND_RULES };
  run.value = startRun(rules.value);
  selectionMode.value = 'automatic';
  sortMode.value = 'rank';
  clearSelection();
  saveStatus.value = 'New run created. Autosaving in this browser.';
}
function restartRun() {
  if (import.meta.client && !window.confirm('Start a new run? Temporary progress resets; permanent upgrades remain.')) return;
  resetToFreshRun();
  lastAction.value = 'New run started. Prestige unlocks remain available in the shop.';
}
const earnedPrestige = computed(() => transcendReward(run.value));
function transcend() {
  const reward = earnedPrestige.value;
  if (!reward) return;
  if (import.meta.client && !window.confirm(`Transcend for ${reward} prestige chips and reset this run?`)) return;
  const permanent = transcendRun(run.value, profile.value);
  profile.value = { ...profile.value, ...permanent };
  resetToFreshRun();
  lastAction.value = `Transcended! Earned ${reward} prestige chips.`;
}
function purchasePermanent(id: PermanentUpgradeId) {
  profile.value = { ...profile.value, ...buyPermanentUpgrade(profile.value, id) };
  lastAction.value = 'Shop perk permanently unlocked. You can purchase it with upgrade chips in the Perk Shop.';
}

function buyPerk(id: RunUpgradeId) {
  // Calculate the complete transaction before updating the reactive UI.
  const purchased = purchaseRunUpgrade(run.value, progress.value, id, profile.value);
  const upgradedRules = applyRunUpgrades(activeRunBaseRules(), purchased);
  const updatedRun = applyPurchasedRuleUpgrade(run.value, rules.value, upgradedRules);

  run.value = updatedRun;
  rules.value = upgradedRules;
  progress.value = purchased;
  // Preserve selected card indices and any manual selection. New cards append
  // after the existing hand, so selections don't move or silently clear.
  lastAction.value = id === 'manual_selection'
    ? 'Manual Hand Selection unlocked immediately! You can switch to Manual now.'
    : id === 'hand_size'
      ? `Extra card drawn! Your hand now holds ${updatedRun.hand.length} cards.`
      : id === 'extra_hand'
        ? `Extra scoring hand added! ${updatedRun.handsRemaining} hands remain.`
        : id === 'extra_discard'
          ? `Extra discard added! ${updatedRun.discardsRemaining} discards remain.`
          : id === 'cards_per_play'
            ? `You can now score 1 to ${upgradedRules.cardsPerPlay} cards per play.`
            : `You can now discard up to ${upgradedRules.maxCardsPerDiscard} cards at once.`;
}


/** The saved payload is also the public modding format: readable, without obfuscation. */
function snapshot(): GameSaveV1 {
  return {
    version: 1,
    savedAt: new Date().toISOString(),
    run: run.value,
    progress: progress.value,
    rules: rules.value,
    profile: profile.value,
    ui: {
      selectedIndexes: selectedIndexes.value,
      selectionMode: selectionMode.value,
      manualOptionId: manualOptionId.value ?? null,
      sortMode: sortMode.value,
    },
  };
}
function installSave(save: GameSaveV1) {
  run.value = save.run;
  rules.value = save.rules;
  progress.value = save.progress;
  profile.value = save.profile;
  selectedIndexes.value = save.ui.selectedIndexes;
  selectionMode.value = save.ui.selectionMode;
  manualOptionId.value = save.ui.manualOptionId ?? undefined;
  sortMode.value = save.ui.sortMode;
  scoredHand.value = save.run.lastScored;
  lastAction.value = 'Local save restored. Continue your run or import edited JSON.';
}
function persistSave() {
  if (!hydrated.value || savingBlocked.value || !import.meta.client) return;
  try {
    const json = formatGameSave(snapshot());
    localStorage.setItem(GAME_SAVE_STORAGE_KEY, json);
    if (!saveJsonDirty.value) saveJson.value = json;
    saveStatus.value = 'Autosaved locally in this browser.';
  } catch (error) {
    savingBlocked.value = true;
    saveStatus.value = 'Autosave paused: ' + (error instanceof Error ? error.message : 'browser storage unavailable');
  }
}
onMounted(() => {
  try {
    const raw = localStorage.getItem(GAME_SAVE_STORAGE_KEY);
    if (raw) {
      installSave(parseGameSave(raw));
      saveStatus.value = 'Existing save restored from this browser.';
    } else {
      saveStatus.value = 'New run. Autosave enabled in this browser.';
    }
  } catch (error) {
    savingBlocked.value = true;
    saveStatus.value = 'Save not loaded: ' + (error instanceof Error ? error.message : 'invalid JSON');
    try {
      saveJson.value = localStorage.getItem(GAME_SAVE_STORAGE_KEY) ?? '';
      saveJsonDirty.value = true;
    } catch { /* storage denied */ }
  } finally {
    hydrated.value = true;
    persistSave();
  }
});
watch([run, rules, progress, profile, selectedIndexes, selectionMode, manualOptionId, sortMode],
  () => {
    if (run.value.round > profile.value.bestRound) profile.value.bestRound = run.value.round;
    persistSave();
  }, { deep: true, flush: 'post' });

function exportSave() {
  try {
    const json = formatGameSave(snapshot());
    saveJson.value = json;
    saveJsonDirty.value = false;
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'pokermanic-save-v1.json';
    link.click();
    URL.revokeObjectURL(url);
    saveStatus.value = 'JSON exported. You can also edit it in the textarea below.';
  } catch (error) {
    saveStatus.value = error instanceof Error ? error.message : 'Could not export save.';
  }
}
function importSave() {
  try {
    const parsed = parseGameSave(saveJson.value);
    installSave(parsed);
    savingBlocked.value = false;
    saveJsonDirty.value = false;
    persistSave();
    saveStatus.value = 'Edited JSON imported successfully and saved locally.';
  } catch (error) {
    saveStatus.value = 'Import rejected (your run is unchanged): ' +
      (error instanceof Error ? error.message : 'invalid JSON');
  }
}

const { data: health, error, status, refresh } = await useFetch('/api/health');
</script>

<template>
  <UContainer class="min-h-screen pt-10 pb-28 md:pt-16 md:pb-28">
    <div class="mx-auto max-w-6xl space-y-9">
      <header class="space-y-4">
        <div class="flex flex-wrap items-center gap-3">
          <p class="uppercase tracking-[0.25em] text-sm text-amber-300">Milestone 7 / Transcendence</p>
          <UBadge color="primary" variant="subtle">Current milestone</UBadge>
        </div>
        <div class="space-y-2">
          <h1 class="text-5xl font-bold tracking-tight md:text-6xl">PokerManic</h1>
          <p class="text-lg text-muted">
            A poker-based survival roguelite in development, built and tested one milestone at a time.
          </p>
        </div>
      </header>

      <section aria-labelledby="hand-heading" class="space-y-4">
        <UCard>
          <div class="space-y-6">
            <div class="flex flex-wrap items-start justify-between gap-4">
              <div class="space-y-1">
                <p class="text-xs font-semibold uppercase tracking-widest text-amber-300">
                  Milestone 7 · Prestige progression
                </p>
                <h2 id="hand-heading" class="text-3xl font-bold">Your hand</h2>
                <p class="text-sm text-muted">
                  Play 1 to {{ rules.cardsPerPlay }} cards to earn scoring chips, or discard up to {{ rules.maxCardsPerDiscard }}.
                  Beat the target, earn upgrade chips, and spend them whenever you like during your run.
                </p>
              </div>
              <UBadge color="success" variant="subtle">Card engine connected</UBadge>
            </div>


            <RoundStatus :run="run" :hand="hand" :remaining-deck="remainingDeck"
              @next-round="nextRound" @restart-run="restartRun" />

            <PlayingCardHand :hand="hand" :selected-indexes="selectedIndexes"
              :scoring-card-indexes="scoringCardIndexes"
              :cards-per-play="rules.cardsPerPlay" :max-cards-per-discard="rules.maxCardsPerDiscard"
              :round="run.round" :hands-played="run.handsPlayed" :in-round="inRound"
              v-model:sort-mode="sortMode" @toggle-card="toggleCard" />

            <ScoringPanel :preview="preview" :scored-hand="scoredHand"
              :eligible-options="eligibleOptions" :selected-cards="selectedCards"
              :selected-count="selectedIndexes.length" :manual-unlocked="manualUnlocked"
              :selection-mode="selectionMode" :cards-per-play="rules.cardsPerPlay"
              :in-round="inRound" :hands-remaining="run.handsRemaining"
              :can-discard-selection="canDiscardSelection"
              @set-selection-mode="setSelectionMode" @choose-scoring-option="chooseScoringOption"
              @score-hand="scoreSelectedHand" @discard-selected="discardSelectedCards"
              @clear-selection="clearSelection" />

            <div class="flex flex-wrap gap-3">
              <UButton data-testid="new-run" icon="i-lucide-rotate-ccw"
                color="neutral" variant="ghost" @click="restartRun">
                Start new run
              </UButton>
            </div>
            <p aria-live="polite" class="text-sm text-muted">{{ lastAction }}</p>
            <p class="text-xs text-muted">
              Played and discarded cards are recycled when needed. Temporary perks take effect immediately. Prestige permanently unlocks perks; each run purchases their effects with upgrade chips.
            </p>
          </div>
        </UCard>
      </section>

      <TranscendencePanel :profile="profile" :earned-prestige="earnedPrestige"
        :perks="PERMANENT_UPGRADES"
        :prices="Object.fromEntries(PERMANENT_UPGRADES.map(perk => [perk.id, permanentUpgradeCost(profile, perk.id)]))"
        @transcend="transcend" @purchase="purchasePermanent" />

      <SaveManager :json="saveJson" @update:json="updateSaveJson" :status="saveStatus" :blocked="savingBlocked"
        @export="exportSave" @import="importSave" @new-run="restartRun" />

      <DevelopmentProgress />

      <SystemStatus :health="health" :error="error" :status="status" @refresh="refresh" />
    </div>
  </UContainer>

  <!-- The viewport dock must not inherit the centered page container's layout. -->
  <PerkShop :phase="run.phase" :progress="progress" :profile="profile" :rules="rules"
    :next-round-rules="nextRoundRules" @buy-perk="buyPerk" />
</template>
