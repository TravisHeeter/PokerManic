<script setup lang="ts">
import { computed, ref } from 'vue';
import type { Card, CardSuit } from '@pokermanic/contracts';
import { createStandardDeck, dealCards, listEligiblePokerHands, resolveScoringOption, shuffleDeck } from '@pokermanic/engine';
import type { ScoringOption } from '@pokermanic/engine';

useSeoMeta({
  title: 'PokerManic | Milestone 3 — Hand evaluation and scoring',
  description: 'Find eligible poker hands and preview the future manual selection perk.',
});

const HAND_SIZE = 8;
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

// A seeded opening hand is identical in SSR and browser hydration.
// Subsequent shuffles use Math.random only when the user clicks.
function openingRandom(): () => number {
  let state = 20261111;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function openingHand() {
  return dealCards(shuffleDeck(createStandardDeck(), openingRandom()), HAND_SIZE);
}

const firstDeal = openingHand();
const hand = ref<Card[]>(firstDeal.hand);
const remainingDeck = ref<Card[]>(firstDeal.remainingDeck);
const handsDealt = ref(1);
const lastAction = ref('Eight cards dealt from the demo deck.');
const canDealNext = computed(() => remainingDeck.value.length >= HAND_SIZE);
const selectedIndexes = ref<number[]>([]);
const selectedInputIndexes = computed(() => hand.value.flatMap((_, i) =>
  selectedIndexes.value.includes(i) ? [i] : []));
const selectedCards = computed(() => selectedInputIndexes.value.map((i) => hand.value[i]!));
const eligibleOptions = computed(() => selectedCards.value.length === 5
  ? listEligiblePokerHands(selectedCards.value) : []);
// Temporary test fixture. Actual unlocking/persistence belongs to the progression system.
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
  if (selectedIndexes.value.includes(index)) {
    selectedIndexes.value = selectedIndexes.value.filter((value) => value !== index);
  } else if (selectedIndexes.value.length < 5) {
    selectedIndexes.value = [...selectedIndexes.value, index];
  }
  manualOptionId.value = undefined;
  scoredHand.value = null;
}

function scoreSelectedHand() {
  if (!preview.value) return;
  scoredHand.value = preview.value;
}

function replaceWithFreshDeck(shuffle: boolean) {
  clearSelection();
  const deck = shuffle ? shuffleDeck(createStandardDeck()) : createStandardDeck();
  const next = dealCards(deck, HAND_SIZE);
  hand.value = next.hand;
  remainingDeck.value = next.remainingDeck;
  handsDealt.value = 1;
  lastAction.value = shuffle
    ? 'Fresh deck shuffled. A new eight-card hand was dealt.'
    : 'Deck reset to its original order. The first eight cards were dealt.';
}

function dealNextHand() {
  if (!canDealNext.value) return;
  clearSelection();
  const next = dealCards(remainingDeck.value, HAND_SIZE);
  hand.value = next.hand;
  remainingDeck.value = next.remainingDeck;
  handsDealt.value += 1;
  lastAction.value = `Hand ${handsDealt.value} dealt. ${remainingDeck.value.length} cards remain in the deck.`;
}

const { data: health, error, status, refresh } = await useFetch('/api/health');
</script>

<template>
  <UContainer class="min-h-screen py-10 md:py-16">
    <div class="mx-auto max-w-6xl space-y-9">
      <header class="space-y-4">
        <div class="flex flex-wrap items-center gap-3">
          <p class="uppercase tracking-[0.25em] text-sm text-amber-300">Milestone 3 / Poker hand scoring</p>
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
                  Milestone 3 interactive scoring demo
                </p>
                <h2 id="hand-heading" class="text-3xl font-bold">Your hand</h2>
                <p class="text-sm text-muted">
                  Choose exactly five cards, recognize the poker hand, then calculate its score. Game rounds and modifiers come later.
                </p>
              </div>
              <UBadge color="success" variant="subtle">Card engine connected</UBadge>
            </div>

            <div class="grid grid-cols-3 gap-3">
              <div class="rounded-lg border border-default p-3">
                <p class="text-xs text-muted">Cards in hand</p>
                <p data-testid="hand-count" class="mt-1 text-2xl font-bold">{{ hand.length }}</p>
              </div>
              <div class="rounded-lg border border-default p-3">
                <p class="text-xs text-muted">Remaining in deck</p>
                <p data-testid="deck-count" class="mt-1 text-2xl font-bold">{{ remainingDeck.length }}</p>
              </div>
              <div class="rounded-lg border border-default p-3">
                <p class="text-xs text-muted">Hands dealt</p>
                <p class="mt-1 text-2xl font-bold">{{ handsDealt }}</p>
              </div>
            </div>

            <p class="text-sm text-muted">
              Choose five cards to play. The game scores the strongest qualifying hand automatically
              until the Manual Hand Selection perk is unlocked.
              <strong data-testid="selected-count" class="text-highlighted">{{ selectedIndexes.length }} of 5 selected</strong>
            </p>

            <div data-testid="card-hand" aria-label="Current eight-card hand" class="grid grid-cols-4 gap-2 sm:grid-cols-8 sm:gap-3">
              <button
                v-for="(card, index) in hand"
                type="button"
                :key="`${handsDealt}-${index}-${card.suit}-${card.rank}`"
                data-testid="playing-card"
                :aria-label="`${selectedIndexes.includes(index) ? 'Deselect' : 'Select'} ${card.rank} of ${card.suit}`"
                :aria-pressed="selectedIndexes.includes(index)"
                :disabled="selectedIndexes.length === 5 && !selectedIndexes.includes(index)"
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
                  <p v-else class="text-sm text-muted">Choose exactly five cards to see the hand type and score.</p>
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
                <UButton data-testid="score-hand" :disabled="!preview" @click="scoreSelectedHand">
                  Score selected hand
                </UButton>
                <UButton data-testid="clear-selection" color="neutral" variant="ghost" :disabled="selectedIndexes.length === 0" @click="clearSelection">
                  Clear selection
                </UButton>
              </div>
              <p v-if="scoredHand" data-testid="scored-hand" aria-live="polite" class="text-sm font-semibold text-amber-300">
                Scored {{ scoredHand.label }}: {{ scoredHand.score }} points.
              </p>
              <p class="text-xs text-muted">
                Only the highlighted scoring cards count toward the selected formation. Base chips × multiplier
                are provisional; card-specific multipliers, discarding, chip thresholds, rounds, perks, and persistence come later.
              </p>
            </div>

            <div class="flex flex-wrap gap-3">
              <UButton data-testid="shuffle-deal" icon="i-lucide-shuffle" @click="replaceWithFreshDeck(true)">
                Shuffle &amp; deal
              </UButton>
              <UButton
                data-testid="deal-next"
                icon="i-lucide-layers"
                color="neutral"
                variant="outline"
                :disabled="!canDealNext"
                @click="dealNextHand"
              >
                Deal next hand
              </UButton>
              <UButton data-testid="reset-deck" icon="i-lucide-rotate-ccw" color="neutral" variant="ghost" @click="replaceWithFreshDeck(false)">
                Reset deck
              </UButton>
            </div>
            <p aria-live="polite" class="text-sm text-muted">{{ lastAction }}</p>
            <p v-if="!canDealNext" class="text-sm text-amber-300">
              Fewer than eight cards remain. Shuffle a fresh deck or reset to continue.
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
            <p class="text-xs uppercase tracking-wide text-muted">Milestone 3</p>
            <p class="font-semibold">Poker hand scoring</p>
            <UBadge color="primary" variant="subtle">Current</UBadge>
          </div>
        </div>
        <p class="text-sm text-muted">
          Milestone 2 created the deck and card interface. Milestone 3 adds eligible-hand discovery,
          automatic scoring and a temporary manual-perk preview. Up next: Milestone 4 — escalating survival rounds.
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
