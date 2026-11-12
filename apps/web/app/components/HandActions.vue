<script setup lang="ts">
import type { ScoringOption } from '@pokermanic/engine';
defineProps<{
  preview: ScoringOption | null;
  inRound: boolean;
  handsRemaining: number;
  canDiscardSelection: boolean;
  selectedCount: number;
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
