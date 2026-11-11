<script setup lang="ts">
import { computed, ref } from 'vue';
import type { Card, CardSuit } from '@pokermanic/contracts';
import { createStandardDeck, dealCards, shuffleDeck } from '@pokermanic/engine';

useSeoMeta({
  title: 'PokerManic | Milestone 2B — Visual card hand',
  description: 'Preview a hand of playing cards, shuffle a deck, and deal new hands.',
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

function replaceWithFreshDeck(shuffle: boolean) {
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
          <p class="uppercase tracking-[0.25em] text-sm text-amber-300">Milestone 2B / Visual card hand</p>
          <UBadge color="primary" variant="subtle">Current milestone</UBadge>
        </div>
        <div class="space-y-2">
          <h1 class="text-5xl font-bold tracking-tight md:text-6xl">PokerManic</h1>
          <p class="text-lg text-muted">
            A poker-inspired roguelike, built and tested one milestone at a time.
          </p>
        </div>
      </header>

      <section aria-labelledby="hand-heading" class="space-y-4">
        <UCard>
          <div class="space-y-6">
            <div class="flex flex-wrap items-start justify-between gap-4">
              <div class="space-y-1">
                <p class="text-xs font-semibold uppercase tracking-widest text-amber-300">
                  Milestone 2B interactive demo
                </p>
                <h2 id="hand-heading" class="text-3xl font-bold">Your hand</h2>
                <p class="text-sm text-muted">
                  This is a deck demonstration. Hand selection, poker scoring, and game rounds come later.
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

            <div data-testid="card-hand" aria-label="Current eight-card hand" class="grid grid-cols-4 gap-2 sm:grid-cols-8 sm:gap-3">
              <div
                v-for="(card, index) in hand"
                :key="`${handsDealt}-${index}-${card.suit}-${card.rank}`"
                data-testid="playing-card"
                role="img"
                :aria-label="`${card.rank} of ${card.suit}`"
                class="relative flex aspect-[5/7] select-none flex-col justify-between rounded-xl border border-slate-200 bg-[#faf8f1] p-2 shadow-lg shadow-black/30 sm:p-3"
                :class="SUIT_TEXT[card.suit]"
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
              </div>
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
            <p class="text-xs uppercase tracking-wide text-muted">Milestone 2B</p>
            <p class="font-semibold">Visual card hand</p>
            <UBadge color="primary" variant="subtle">Current</UBadge>
          </div>
          <div class="rounded-lg border border-default p-4 space-y-2">
            <p class="text-xs uppercase tracking-wide text-muted">Up next</p>
            <p class="font-semibold">Milestone 3 — Poker hand evaluation</p>
            <UBadge color="neutral" variant="subtle">Not started</UBadge>
          </div>
        </div>
        <p class="text-sm text-muted">
          Milestone 2A delivered the underlying 52-card engine. This milestone makes it visible and interactive.
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
