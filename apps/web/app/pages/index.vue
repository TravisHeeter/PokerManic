<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  DEFAULT_ROUND_RULES,
  advanceRound,
  applyRunUpgrades,
  awardRoundUpgradeChips,
  createRunProgress,
  discardCards,
  listEligiblePokerHands,
  playScoringHand,
  purchaseRunUpgrade,
  resolveScoringOption,
  startRun,
  manualSelectionUnlocked,
} from '@pokermanic/engine';
import type { RunState, ScoringOption, RunUpgradeId, RunProgress } from '@pokermanic/engine';

useSeoMeta({
  title: 'PokerManic | Milestone 5 — Run upgrades',
  description: 'Earn upgrade chips on round wins and purchase run upgrades at any time during a run.',
});

const progress = ref<RunProgress>(createRunProgress());
// Snapshot the rules at the start of each round. Mid-round purchases must not
// silently change the number of selected cards, existing hand size or allowances.
const rules = ref({ ...DEFAULT_ROUND_RULES });
const nextRoundRules = computed(() => applyRunUpgrades(DEFAULT_ROUND_RULES, progress.value));

// The first shuffled deck is reproducible during SSR and browser hydration.
// New rounds and player-triggered restarts use genuine random shuffles.
function openingRandom(): () => number {
  let state = 20261111;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

const run = ref<RunState>(startRun(DEFAULT_ROUND_RULES, openingRandom()));
const hand = computed(() => run.value.hand);
const remainingDeck = computed(() => run.value.drawPile);
const inRound = computed(() => run.value.phase === 'playing');
const selectedIndexes = ref<number[]>([]);
const selectedInputIndexes = computed(() => hand.value.flatMap((_, i) =>
  selectedIndexes.value.includes(i) ? [i] : []));
const selectedCards = computed(() => selectedInputIndexes.value.map((i) => hand.value[i]!));
const eligibleOptions = computed(() => selectedCards.value.length === rules.value.cardsPerPlay
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

function restartRun() {
  progress.value = createRunProgress();
  rules.value = { ...DEFAULT_ROUND_RULES };
  run.value = startRun(rules.value);
  selectionMode.value = 'automatic';
  clearSelection();
  lastAction.value = 'New run started. Run-only perks, upgrade chips and prior scores were reset.';
}

function buyPerk(id: RunUpgradeId) {
  // The engine enforces affordability and prevents purchases after defeat.
  progress.value = purchaseRunUpgrade(run.value, progress.value, id);
  // A purchase never interrupts the player's selected cards or current round.
  // Manual selection is immediately usable; rule modifiers start next round.
  lastAction.value = id === 'manual_selection'
    ? 'Manual Hand Selection unlocked! Switch to Manual to choose your scoring cards.'
    : 'Perk purchased. Your upgraded limits take effect next round.';
}

const { data: health, error, status, refresh } = await useFetch('/api/health');
</script>

<template>
  <UContainer class="min-h-screen py-10 md:py-16">
    <div class="mx-auto max-w-6xl space-y-9">
      <header class="space-y-4">
        <div class="flex flex-wrap items-center gap-3">
          <p class="uppercase tracking-[0.25em] text-sm text-amber-300">Milestone 5 / Run upgrades</p>
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
                  Milestone 5 playable upgrade demo
                </p>
                <h2 id="hand-heading" class="text-3xl font-bold">Your hand</h2>
                <p class="text-sm text-muted">
                  Play {{ rules.cardsPerPlay }} cards to earn scoring chips, or discard up to {{ rules.maxCardsPerDiscard }}.
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
              @toggle-card="toggleCard" />

            <ScoringPanel :preview="preview" :scored-hand="scoredHand"
              :eligible-options="eligibleOptions" :selected-cards="selectedCards"
              :selected-count="selectedIndexes.length" :manual-unlocked="manualUnlocked"
              :selection-mode="selectionMode" :cards-per-play="rules.cardsPerPlay"
              :in-round="inRound" :hands-remaining="run.handsRemaining"
              @set-selection-mode="setSelectionMode" @choose-scoring-option="chooseScoringOption"
              @score-hand="scoreSelectedHand" @clear-selection="clearSelection" />

            <div class="flex flex-wrap gap-3">
              <UButton data-testid="discard-selected" icon="i-lucide-trash-2"
                color="neutral" variant="outline" :disabled="!canDiscardSelection"
                @click="discardSelectedCards">
                Discard selected ({{ selectedIndexes.length }})
              </UButton>
              <UButton data-testid="new-run" icon="i-lucide-rotate-ccw"
                color="neutral" variant="ghost" @click="restartRun">
                Start new run
              </UButton>
            </div>
            <p aria-live="polite" class="text-sm text-muted">{{ lastAction }}</p>
            <p class="text-xs text-muted">
              Played and discarded cards are recycled when needed. Rule upgrades purchased during play apply to the next round.
            </p>
          </div>
        </UCard>
      </section>

      <PerkShop :phase="run.phase" :progress="progress" :rules="rules"
        :next-round-rules="nextRoundRules" @buy-perk="buyPerk" />

      <DevelopmentProgress />

      <SystemStatus :health="health" :error="error" :status="status" @refresh="refresh" />
    </div>
  </UContainer>
</template>
