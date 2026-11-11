<script setup lang="ts">
useSeoMeta({
  title: 'PokerManic | Milestone 2A — Card engine',
  description: 'Track the latest PokerManic milestone while we build the game incrementally.',
});

// These details are intentionally visible even when the game engine has no UI yet.
// Update this milestone summary with every future milestone.
const milestone = {
  label: 'Milestone 2A',
  title: 'Card engine',
  description: 'The core playing-card logic is ready for testing. Our first playable hand comes next.',
  features: [
    {
      title: 'Deck generation',
      description: 'A standard deck with 52 cards, 4 suits and 13 ranks.',
    },
    {
      title: 'Shuffling',
      description: 'Non-mutating Fisher–Yates shuffle with repeatable unit tests.',
    },
    {
      title: 'Dealing',
      description: 'Deal a hand while preserving the remaining deck.',
    },
  ],
  next: 'Milestone 2B — Display a hand of cards in Vue',
} as const;

// Nuxt fetches this on the server for initial SSR, then hydrates the result.
const { data: health, error, status, refresh } = await useFetch('/api/health');
</script>

<template>
  <UContainer class="min-h-screen py-12 md:py-20">
    <div class="mx-auto max-w-5xl space-y-10">
      <header class="space-y-5">
        <div class="flex flex-wrap items-center gap-3">
          <p class="uppercase tracking-[0.25em] text-sm text-amber-300">{{ milestone.label }}</p>
          <UBadge color="primary" variant="subtle">Current milestone</UBadge>
        </div>
        <div class="space-y-3">
          <h1 class="text-5xl font-bold tracking-tight md:text-6xl">PokerManic</h1>
          <p class="text-xl text-muted">A poker-inspired roguelike, built and tested one step at a time.</p>
        </div>
      </header>

      <section aria-labelledby="milestone-heading" class="space-y-5">
        <UCard>
          <div class="space-y-6">
            <div class="space-y-2">
              <p class="text-xs font-semibold uppercase tracking-widest text-amber-300">
                Latest development milestone
              </p>
              <h2 id="milestone-heading" class="text-3xl font-bold">{{ milestone.title }}</h2>
              <p class="text-muted">{{ milestone.description }}</p>
            </div>

            <div class="grid gap-3 sm:grid-cols-3">
              <div
                v-for="feature in milestone.features"
                :key="feature.title"
                class="rounded-lg border border-default p-4 space-y-2"
              >
                <p class="font-semibold">{{ feature.title }}</p>
                <p class="text-sm text-muted">{{ feature.description }}</p>
              </div>
            </div>

            <div class="rounded-lg border border-dashed border-default p-4">
              <p class="font-medium">No playable cards yet</p>
              <p class="mt-1 text-sm text-muted">
                This milestone focuses on the tested TypeScript engine, not card rendering.
                The next milestone will connect it to a visible Vue hand.
              </p>
            </div>
          </div>
        </UCard>

        <div class="grid gap-3 md:grid-cols-3">
          <div class="rounded-lg border border-default p-4 space-y-1">
            <p class="text-xs uppercase tracking-wider text-muted">Milestone 1</p>
            <p class="font-semibold">Foundation</p>
            <UBadge color="success" variant="subtle">Implemented</UBadge>
          </div>
          <div class="rounded-lg border border-primary p-4 space-y-1">
            <p class="text-xs uppercase tracking-wider text-muted">{{ milestone.label }}</p>
            <p class="font-semibold">{{ milestone.title }}</p>
            <UBadge color="primary" variant="subtle">Current</UBadge>
          </div>
          <div class="rounded-lg border border-default p-4 space-y-1">
            <p class="text-xs uppercase tracking-wider text-muted">Up next</p>
            <p class="font-semibold">{{ milestone.next }}</p>
            <UBadge color="neutral" variant="subtle">Not started</UBadge>
          </div>
        </div>
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

      <footer class="text-sm text-muted">
        Each future milestone will update this page and its automated rendering check.
      </footer>
    </div>
  </UContainer>
</template>
