<script setup lang="ts">
import { computed, ref } from 'vue';
import type { CardSuit } from '@pokermanic/contracts';
import {
  DEFAULT_ROUND_RULES,
  advanceRound,
  discardCards,
  listEligiblePokerHands,
  playScoringHand,
  resolveScoringOption,
  startRun,
} from '@pokermanic/engine';
import type { RunState, ScoringOption } from '@pokermanic/engine';

useSeoMeta({
  title: 'PokerManic | Milestone 4 — Survival rounds',
  description: 'Survive escalating poker chip thresholds with limited hands and discards.',
});

const rules = DEFAULT_ROUND_RULES;
const SUIT_SYMBOLS: Record<CardSuit, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};
const SUIT_TEXT: Record<CardSuit, string> = {
  hearts: 'text-[#87565D]',
  diamonds: 'text-[#998258]',
  clubs: 'text-[#577A75]',
  spades: 'text-slate-800',
};

// The first shuffled deck is reproducible during SSR and browser hydration.
// New rounds and player-triggered restarts use genuine random shuffles.
function openingRandom(): () => number {
  let state = 20261111;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

const run = ref<RunState>(startRun(rules, openingRandom()));
const hand = computed(() => run.value.hand);
const remainingDeck = computed(() => run.value.drawPile);
const inRound = computed(() => run.value.phase === 'playing');
const selectedIndexes = ref<number[]>([]);
const selectedInputIndexes = computed(() => hand.value.flatMap((_, i) =>
  selectedIndexes.value.includes(i) ? [i] : []));
const selectedCards = computed(() => selectedInputIndexes.value.map((i) => hand.value[i]!));
const eligibleOptions = computed(() => selectedCards.value.length === rules.cardsPerPlay
  ? listEligiblePokerHands(selectedCards.value) : []);

// Temporary developer preview only: no purchasable/persistent perk has been unlocked.
const demoPerkUnlocked = ref(false);
const selectionMode = ref<'automatic' | 'manual'>('automatic');
const manualOptionId = ref<string>();
const preview = computed(() => resolveScoringOption(eligibleOptions.value, {
  manualSelectionUnlocked: demoPerkUnlocked.value,
  selectionMode: selectionMode.value,
}, manualOptionId.value));
const scoringCardIndexes = computed(() => preview.value?.scoringCardIndices
  .map((i) => selectedInputIndexes.value[i]!) ?? []);
const scoredHand = ref<ScoringOption | null>(null);
const lastAction = ref('Run started. Select five cards to score or discard up to five.');
const canDiscardSelection = computed(() => inRound.value
  && run.value.discardsRemaining > 0
  && selectedIndexes.value.length >= 1
  && selectedIndexes.value.length <= rules.maxCardsPerDiscard);

function clearSelection() {
  selectedIndexes.value = [];
  manualOptionId.value = undefined;
  scoredHand.value = null;
}

function toggleDemoPerk() {
  demoPerkUnlocked.value = !demoPerkUnlocked.value;
  if (!demoPerkUnlocked.value) selectionMode.value = 'automatic';
  manualOptionId.value = undefined;
  scoredHand.value = null;
}

function setSelectionMode(mode: 'automatic' | 'manual') {
  if (mode === 'manual' && !demoPerkUnlocked.value) return;
  selectionMode.value = mode;
  scoredHand.value = null;
}

function chooseScoringOption(optionId: string) {
  if (!demoPerkUnlocked.value || selectionMode.value !== 'manual') return;
  manualOptionId.value = optionId;
  scoredHand.value = null;
}

function toggleCard(index: number) {
  if (!inRound.value) return;
  if (selectedIndexes.value.includes(index)) {
    selectedIndexes.value = selectedIndexes.value.filter((value) => value !== index);
  } else if (selectedIndexes.value.length < rules.cardsPerPlay) {
    selectedIndexes.value = [...selectedIndexes.value, index];
  }
  manualOptionId.value = undefined;
  scoredHand.value = null;
}

function scoreSelectedHand() {
  if (!preview.value || !inRound.value) return;
  const next = playScoringHand(run.value, selectedInputIndexes.value, {
    manualSelectionUnlocked: demoPerkUnlocked.value,
    selectionMode: selectionMode.value,
  }, manualOptionId.value, rules);
  const scored = next.lastScored;
  run.value = next;
  clearSelection();
  scoredHand.value = scored;
  lastAction.value = scored
    ? `Scored ${scored.label}: +${scored.score} chips. ${next.roundChips} / ${next.roundTarget} this round.`
    : 'Hand scored.';
}

function discardSelectedCards() {
  if (!canDiscardSelection.value) return;
  const count = selectedIndexes.value.length;
  run.value = discardCards(run.value, selectedIndexes.value, rules);
  clearSelection();
  lastAction.value = `Discarded ${count} ${count === 1 ? 'card' : 'cards'} and drew replacements.`;
}

function nextRound() {
  if (run.value.phase !== 'round_won') return;
  run.value = advanceRound(run.value, rules);
  clearSelection();
  lastAction.value = `Round ${run.value.round} started. Reach ${run.value.roundTarget} chips to survive.`;
}

function restartRun() {
  run.value = startRun(rules);
  clearSelection();
  lastAction.value = 'A new run started at Round 1. Previous run scores were reset.';
}

const { data: health, error, status, refresh } = await useFetch('/api/health');
</script>

<template>
  <UContainer class="min-h-screen py-10 md:py-16">
    <div class="mx-auto max-w-6xl space-y-9">
      <header class="space-y-4">
        <div class="flex flex-wrap items-center gap-3">
          <p class="uppercase tracking-[0.25em] text-sm text-amber-300">Milestone 4 / Survival rounds</p>
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
                  Milestone 4 playable survival demo
                </p>
                <h2 id="hand-heading" class="text-3xl font-bold">Your hand</h2>
                <p class="text-sm text-muted">
                  Play five cards to earn chips, or discard up to five to improve your hand. Beat the escalating target before your scoring hands run out.
                </p>
              </div>
              <UBadge color="success" variant="subtle">Card engine connected</UBadge>
            </div>

            <div class="space-y-4 rounded-xl border border-amber-300/30 p-4" aria-label="Round status">
              <div class="flex flex-wrap items-center justify-between gap-3">
                <div class="space-y-1">
                  <p class="text-xs uppercase tracking-widest text-amber-300">Endless survival</p>
                  <h3 data-testid="round-number" class="text-2xl font-bold">Round {{ run.round }}</h3>
                </div>
                <UBadge :color="run.phase === 'round_won' ? 'success' : run.phase === 'game_over' ? 'error' : 'primary'"
                  variant="subtle" data-testid="run-phase">
                  {{ run.phase === 'round_won' ? 'Target reached' : run.phase === 'game_over' ? 'Run over' : 'In progress' }}
                </UBadge>
              </div>
              <div class="space-y-2">
                <div class="flex items-center justify-between text-sm">
                  <span>Round chips</span>
                  <span data-testid="round-score" class="font-semibold">{{ run.roundChips }} / {{ run.roundTarget }}</span>
                </div>
                <progress :value="Math.min(run.roundChips, run.roundTarget)" :max="run.roundTarget"
                  class="h-3 w-full accent-amber-400" aria-label="Progress toward chip target" />
              </div>
              <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div class="rounded-lg border border-default p-3">
                  <p class="text-xs text-muted">Chip target</p>
                  <p data-testid="chip-target" class="mt-1 text-xl font-bold">{{ run.roundTarget }}</p>
                </div>
                <div class="rounded-lg border border-default p-3">
                  <p class="text-xs text-muted">Hands remaining</p>
                  <p data-testid="hands-remaining" class="mt-1 text-xl font-bold">{{ run.handsRemaining }}</p>
                </div>
                <div class="rounded-lg border border-default p-3">
                  <p class="text-xs text-muted">Discards remaining</p>
                  <p data-testid="discards-remaining" class="mt-1 text-xl font-bold">{{ run.discardsRemaining }}</p>
                </div>
                <div class="rounded-lg border border-default p-3">
                  <p class="text-xs text-muted">Cards in hand</p>
                  <p data-testid="hand-count" class="mt-1 text-xl font-bold">{{ hand.length }}</p>
                </div>
                <div class="rounded-lg border border-default p-3">
                  <p class="text-xs text-muted">Remaining in deck</p>
                  <p data-testid="deck-count" class="mt-1 text-xl font-bold">{{ remainingDeck.length }}</p>
                </div>
                <div class="rounded-lg border border-default p-3">
                  <p class="text-xs text-muted">Run total chips</p>
                  <p data-testid="total-score" class="mt-1 text-xl font-bold">{{ run.totalChips }}</p>
                </div>
              </div>
              <div v-if="run.phase === 'round_won'" class="space-y-3">
                <p class="text-sm text-green-400">Target reached! Continue when ready. The next round has a higher chip target.</p>
                <UButton data-testid="next-round" icon="i-lucide-arrow-right" @click="nextRound">Next round</UButton>
              </div>
              <div v-else-if="run.phase === 'game_over'" class="space-y-2">
                <p class="text-sm text-red-400">
                  Run over — you needed {{ run.roundTarget }} chips but earned {{ run.roundChips }}.
                  You survived through Round {{ run.round }}.
                </p>
                <UButton data-testid="restart-run" @click="restartRun">Start new run</UButton>
              </div>
              <p v-else class="text-xs text-muted">
                Targets increase every round. Longer runs gradually gain additional scoring hands and discards.
                There is no fixed final round.
              </p>
            </div>

            <p class="text-sm text-muted">
              Choose five cards to score, or select one to five cards to discard. The game scores the strongest qualifying hand automatically
              until the Manual Hand Selection perk is unlocked.
              <strong data-testid="selected-count" class="text-highlighted">{{ selectedIndexes.length }} of {{ rules.cardsPerPlay }} selected</strong>
            </p>

            <div data-testid="card-hand" aria-label="Current eight-card hand" class="grid grid-cols-4 gap-2 sm:grid-cols-8 sm:gap-3">
              <button
                v-for="(card, index) in hand"
                type="button"
                :key="`${run.round}-${run.handsPlayed}-${index}-${card.suit}-${card.rank}`"
                data-testid="playing-card"
                :aria-label="`${selectedIndexes.includes(index) ? 'Deselect' : 'Select'} ${card.rank} of ${card.suit}`"
                :aria-pressed="selectedIndexes.includes(index)"
                :disabled="!inRound || (selectedIndexes.length === rules.cardsPerPlay && !selectedIndexes.includes(index))"
                @click="toggleCard(index)"
                class="relative flex aspect-[5/7] select-none flex-col justify-between rounded-xl border border-slate-200 bg-[#faf8f1] p-2 text-left shadow-lg shadow-black/30 transition-all hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 disabled:cursor-not-allowed disabled:opacity-60 sm:p-3"
                :data-scoring-card="scoringCardIndexes.includes(index) ? 'true' : 'false'"
                :class="[
                  SUIT_TEXT[card.suit],
                  scoringCardIndexes.includes(index) ? '-translate-y-2 ring-4 ring-amber-300' :
                    selectedIndexes.includes(index) ? '-translate-y-1 ring-2 ring-sky-500' : '',
                ]"
              >
                <div class="flex flex-col items-start leading-none">
                  <span class="text-lg font-bold sm:text-2xl">{{ card.rank }}</span>
                  <span class="mt-1 text-lg sm:text-xl">{{ SUIT_SYMBOLS[card.suit] }}</span>
                </div>
                <span aria-hidden="true" class="self-center text-3xl sm:text-5xl">{{ SUIT_SYMBOLS[card.suit] }}</span>
                <div aria-hidden="true" class="flex rotate-180 flex-col items-start leading-none">
                  <span class="text-lg font-bold sm:text-2xl">{{ card.rank }}</span>
                  <span class="mt-1 text-lg sm:text-xl">{{ SUIT_SYMBOLS[card.suit] }}</span>
                </div>
              </button>
            </div>

            <div class="space-y-4 rounded-lg border border-default p-4">
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div class="space-y-1">
                  <h3 class="font-semibold text-lg">Poker hand evaluation</h3>
                  <p v-if="preview" data-testid="hand-preview" class="text-sm">
                    <strong>{{ preview.label }}</strong> — {{ preview.baseChips }} chips
                    × {{ preview.multiplier }} multiplier = <strong>{{ preview.score }} points</strong>
                  </p>
                  <p v-else class="text-sm text-muted">Choose five cards to see the hand type and score.</p>
                </div>
                <UBadge color="neutral" variant="subtle">Base values only</UBadge>
              </div>
              <div class="space-y-3 rounded-lg border border-default p-3">
                <div class="flex flex-wrap items-center justify-between gap-3">
                  <div class="space-y-1">
                    <h4 class="font-semibold">Hand selection</h4>
                    <p class="text-xs text-muted">
                      Automatic chooses the highest-ranking formation, not necessarily the highest scoring after upgrades.
                    </p>
                  </div>
                  <UButton data-testid="preview-unlock" size="sm" color="neutral" variant="outline" @click="toggleDemoPerk">
                    {{ demoPerkUnlocked ? 'Re-lock perk preview' : 'Preview unlocked perk' }}
                  </UButton>
                </div>
                <p class="text-xs text-amber-300">
                  Developer preview only: this is not a purchased or persistent perk.
                </p>
                <div role="group" aria-label="Hand selection mode" class="flex flex-wrap gap-2">
                  <UButton data-testid="automatic-mode" size="sm" :variant="selectionMode === 'automatic' ? 'solid' : 'outline'"
                    @click="setSelectionMode('automatic')">Automatic</UButton>
                  <UButton data-testid="manual-mode" size="sm" :variant="selectionMode === 'manual' ? 'solid' : 'outline'"
                    :disabled="!demoPerkUnlocked" @click="setSelectionMode('manual')">Manual</UButton>
                </div>
                <p v-if="selectionMode === 'automatic'" class="text-xs text-muted">
                  Automatic selection active. Scoring choices below are disabled.
                </p>
                <p v-else class="text-xs text-muted">
                  Select a formation below. Highlighted cards are the ones that contribute to scoring.
                </p>
                <div v-if="eligibleOptions.length" data-testid="scoring-options"
                  class="max-h-64 space-y-2 overflow-y-auto" role="radiogroup" aria-label="Qualifying scoring hands">
                  <label v-for="option in eligibleOptions" :key="option.id"
                    class="flex items-start gap-2 rounded-md border border-default p-2 text-sm"
                    :class="!demoPerkUnlocked || selectionMode === 'automatic' ? 'opacity-55' : 'cursor-pointer'">
                    <input type="radio" name="scoring-option" class="mt-1 accent-amber-400"
                      :value="option.id" :checked="preview?.id === option.id"
                      :disabled="!demoPerkUnlocked || selectionMode === 'automatic'"
                      @change="chooseScoringOption(option.id)">
                    <span>{{ option.label }}:
                      <span class="text-muted">{{ option.scoringCardIndices.map(i =>
                        selectedCards[i]!.rank + ' of ' + selectedCards[i]!.suit).join(', ') }}</span>
                    </span>
                  </label>
                </div>
                <p v-else class="text-xs text-muted">Select five cards to see eligible formations.</p>
              </div>

              <div class="flex flex-wrap items-center gap-3">
                <UButton data-testid="score-hand" :disabled="!preview || !inRound || run.handsRemaining === 0" @click="scoreSelectedHand">
                  Score selected hand
                </UButton>
                <UButton data-testid="clear-selection" color="neutral" variant="ghost" :disabled="selectedIndexes.length === 0" @click="clearSelection">
                  Clear selection
                </UButton>
              </div>
              <p v-if="scoredHand" data-testid="scored-hand" aria-live="polite" class="text-sm font-semibold text-amber-300">
                Scored {{ scoredHand.label }}: +{{ scoredHand.score }} chips.
              </p>
              <p class="text-xs text-muted">
                Only the highlighted cards contribute to scoring, but all five committed cards leave your hand.
                Cards discarded using the separate action are replaced without earning chips.
                Chip values are provisional; paid perks, card-specific multipliers, and persistence come later.
              </p>
            </div>

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
              If the draw pile empties, used cards are shuffled back in automatically. There is no deck-exhaustion loss.
            </p>
          </div>
        </UCard>
      </section>

      <section aria-labelledby="progress-heading" class="space-y-3">
        <h2 id="progress-heading" class="text-xl font-semibold">Development progress</h2>
        <div class="grid gap-3 sm:grid-cols-3">
          <div class="rounded-lg border border-default p-4 space-y-2">
            <p class="text-xs uppercase tracking-wide text-muted">Milestone 1</p>
            <p class="font-semibold">Foundation</p>
            <UBadge color="success" variant="subtle">Implemented</UBadge>
          </div>
          <div class="rounded-lg border border-primary p-4 space-y-2">
            <p class="text-xs uppercase tracking-wide text-muted">Milestone 2</p>
            <p class="font-semibold">Deck and visual cards</p>
            <UBadge color="success" variant="subtle">Implemented</UBadge>
          </div>
          <div class="rounded-lg border border-default p-4 space-y-2">
            <p class="text-xs uppercase tracking-wide text-muted">Milestone 4</p>
            <p class="font-semibold">Survival rounds</p>
            <UBadge color="primary" variant="subtle">Current</UBadge>
          </div>
        </div>
        <p class="text-sm text-muted">
          Milestone 3 delivered eligible-hand discovery and automatic scoring, with a temporary perk preview.
          Milestone 4 adds playable rounds, score thresholds, hands and discards.
          Up next: Milestone 5 — player upgrades and progression foundations.
        </p>
      </section>

      <section aria-labelledby="system-heading">
        <UCard>
          <div class="space-y-4">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <h2 id="system-heading" class="text-xl font-semibold">System status</h2>
              <UBadge :color="error ? 'error' : health ? 'success' : 'neutral'" variant="subtle">
                {{ error ? 'API unavailable' : health ? 'API connected' : 'Connecting' }}
              </UBadge>
            </div>
            <div v-if="health" class="grid gap-2 text-sm sm:grid-cols-3">
              <p><span class="text-muted">Backend:</span> {{ health.service }}</p>
              <p><span class="text-muted">Contract:</span> {{ health.version }}</p>
              <p><span class="text-muted">Status:</span> {{ health.status }}</p>
            </div>
            <p v-else-if="error" class="text-sm text-error">
              Unable to reach the API. Start both servers with pnpm dev and try again.
            </p>
            <p v-else class="text-sm text-muted">Checking backend connection…</p>

            <UButton color="primary" variant="soft" :loading="status === 'pending'" @click="refresh()">
              Check connection again
            </UButton>
          </div>
        </UCard>
      </section>
    </div>
  </UContainer>
</template>
