<script setup lang="ts">
useSeoMeta({
  title: 'PokerManic | Foundation',
  description: 'A poker-inspired roguelike deckbuilder, built one tested milestone at a time.',
});

// Nuxt fetches on the server for the first page request, then hydrates the result.
const { data: health, error, status, refresh } = await useFetch('/api/health');
</script>

<template>
  <UContainer class="min-h-screen flex items-center justify-center py-16">
    <div class="w-full max-w-2xl space-y-8">
      <header class="space-y-3">
        <p class="uppercase tracking-[0.3em] text-sm text-amber-300">Milestone 1 / Foundation</p>
        <h1 class="text-5xl font-bold tracking-tight">PokerManic</h1>
        <p class="text-lg text-muted">A poker-inspired roguelike, built and verified one step at a time.</p>
      </header>

      <UCard>
        <div class="space-y-5">
          <div class="flex items-center justify-between gap-3">
            <h2 class="text-xl font-semibold">System status</h2>
            <UBadge :color="error ? 'error' : health ? 'success' : 'neutral'" variant="subtle">
              {{ error ? 'API unavailable' : health ? 'API connected' : 'Connecting' }}
            </UBadge>
          </div>

          <div v-if="health" class="space-y-2 text-sm">
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

      <p class="text-xs text-muted">
        No cards or game rules yet. First we prove that SSR, the API, and shared contracts work.
      </p>
    </div>
  </UContainer>
</template>
