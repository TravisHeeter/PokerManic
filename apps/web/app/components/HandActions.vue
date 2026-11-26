<script setup lang="ts">
import type { ScoringOption } from '@pokermanic/engine';
defineProps<{
  preview: ScoringOption | null;
  inRound: boolean;
  handsRemaining: number;
  canDiscardSelection: boolean;
  selectedCount: number;
  cardsPerPlay: number;
  discardsRemaining: number;
}>();
const emit = defineEmits<{
  'score-hand': [];
  'discard-selected': [];
  'clear-selection': [];
}>();
</script>

<template>
  <div data-testid="hand-actions" class="space-y-2" aria-label="Card actions">
    <div data-testid="hand-score-summary" aria-live="polite" class="grid grid-cols-3 gap-2 rounded-lg border border-default bg-elevated/40 p-2 text-center">
      <div class="min-w-0 rounded-md bg-default/50 px-2 py-2">
        <p class="text-[10px] font-semibold uppercase tracking-wide text-muted">Chips</p>
        <p data-testid="hand-chips" class="text-lg font-bold tabular-nums text-sky-300">{{ preview?.baseChips ?? 0 }}</p>
      </div>
      <div class="min-w-0 rounded-md bg-default/50 px-2 py-2">
        <p class="text-[10px] font-semibold uppercase tracking-wide text-muted">Mult</p>
        <p data-testid="hand-mult" class="text-lg font-bold tabular-nums text-red-300">{{ preview?.combinationType === 'separate' ? 'Separate' : `×${preview?.multiplier ?? 1}` }}</p>
      </div>
      <div class="min-w-0 rounded-md bg-default/50 px-2 py-2">
        <p class="text-[10px] font-semibold uppercase tracking-wide text-muted">Hand</p>
        <p data-testid="hand-type" class="break-words text-sm font-bold">{{ preview?.label ?? (selectedCount > cardsPerPlay ? 'Play limit exceeded' : 'Select cards') }}</p>
      </div>
      <ul
        v-if="preview?.components && selectedCount <= cardsPerPlay"
        data-testid="hand-score-breakdown"
        aria-label="Scoring hand contributions"
        class="col-span-full grid gap-1 border-t border-default pt-2 text-xs"
      >
        <li
          v-for="component in preview.components"
          :key="component.id"
          class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-left"
        >
          <span class="font-medium">{{ component.label }}</span>
          <span class="flex flex-wrap gap-x-2 tabular-nums text-muted">
            <span>{{ component.baseChips.toLocaleString('en-US') }} base chips</span>
            <span v-if="preview.combinationType === 'separate'">
              ×{{ component.multiplier }} = {{ component.score.toLocaleString('en-US') }} chips
            </span>
            <span v-else class="text-red-300">+{{ component.multiplier }} mult</span>
          </span>
        </li>
      </ul>
    </div>
    <p v-if="selectedCount > cardsPerPlay" data-testid="play-limit-warning" role="status" class="text-center text-sm text-amber-300">
      {{ selectedCount }} cards selected — your current play limit is {{ cardsPerPlay }}. Upgrade Cards per Play or deselect {{ selectedCount - cardsPerPlay }}.
    </p>
    <p v-else-if="preview" data-testid="hand-total-score" class="text-center text-xs text-muted">
      Estimated score: <strong class="text-amber-300">{{ preview.score.toLocaleString('en-US') }} chips</strong>
    </p>
              <div  role="group" 
                    aria-label="Play or discard selected cards"
                    class="grid rounded-lg border border-default bg-elevated/50 p-3">
                <div class="grid grid-row grid-cols-2 gap-1">
                  <UButton  data-testid="score-hand" 
                            aria-label="Play selected cards" 
                            title="Play selected cards" 
                            color="success" 
                            variant="solid" 
                            size="xl"
                            icon="i-lucide-play" 
                            class="justify-center px-6 font-bold shadow-md"
                            :disabled="!preview || !inRound || handsRemaining === 0" 
                            @click="emit('score-hand')">
                    (x{{ handsRemaining }})
                  </UButton>
                  <UButton  data-testid="discard-selected" aria-label="Discard selected cards" title="Discard selected cards" 
                            color="warning" 
                            variant="solid" 
                            size="xl"
                            icon="i-lucide-trash-2" 
                            class="justify-center px-6 font-bold shadow-md"
                            :disabled="!canDiscardSelection" 
                            @click="emit('discard-selected')">
                    (x{{discardsRemaining}})
                  </UButton>
                </div>
                <div class="grid grid-row grid-cols-1 mt-2">
                  <UButton  data-testid="clear-selection" 
                          class="justify-center px-6 font-bold shadow-md"          
                          color="neutral" variant="outline" size="lg"
                          :disabled="selectedCount === 0" @click="emit('clear-selection')">
                  Clear selection
                </UButton>
                </div>
              </div>
  </div>
</template>
