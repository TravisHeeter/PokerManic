<script setup lang="ts">
defineProps<{
  health: { service: string; version: string; status: string } | null | undefined;
  error: unknown;
  status: string;
}>();
const emit = defineEmits<{ refresh: [] }>();
</script>

<template>
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

            <UButton color="primary" variant="soft" :loading="status === 'pending'" @click="emit('refresh')">
              Check connection again
            </UButton>
          </div>
        </UCard>
      </section>
</template>
