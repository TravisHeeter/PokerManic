<script setup lang="ts">
import type { Card } from '@pokermanic/contracts';
import type { RunState } from '@pokermanic/engine';
defineProps<{ run: RunState; hand: Card[]; remainingDeck: Card[] }>();
const emit = defineEmits<{ 'next-round': []; 'restart-run': [] }>();
</script>

<template>
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
                  <p class="text-xs text-muted">Run scoring chips</p>
                  <p data-testid="total-score" class="mt-1 text-xl font-bold">{{ run.totalChips }}</p>
                </div>
              </div>
              <div v-if="run.phase === 'round_won'" class="space-y-3">
                <p class="text-sm text-green-400">Target reached! Continue when ready. The next round has a higher chip target.</p>
                <UButton data-testid="next-round" icon="i-lucide-arrow-right" @click="emit('next-round')">Next round</UButton>
              </div>
              <div v-else-if="run.phase === 'game_over'" class="space-y-2">
                <p class="text-sm text-red-400">
                  Run over — you needed {{ run.roundTarget }} chips but earned {{ run.roundChips }}.
                  You survived through Round {{ run.round }}.
                </p>
                <UButton data-testid="restart-run" @click="emit('restart-run')">Start new run</UButton>
              </div>
              <p v-else class="text-xs text-muted">
                Targets increase every round. Longer runs gradually gain additional scoring hands and discards.
                There is no fixed final round.
              </p>
            </div>
</template>
