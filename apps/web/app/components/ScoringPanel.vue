<script setup lang="ts">
import type { Card } from '@pokermanic/contracts';
import type { ScoringOption } from '@pokermanic/engine';
defineProps<{
  preview: ScoringOption | null;
  scoredHand: ScoringOption | null;
  eligibleOptions: ScoringOption[];
  selectedCards: Card[];
  selectedCount: number;
  manualUnlocked: boolean;
  selectionMode: 'automatic' | 'manual';
  cardsPerPlay: number;
  inRound: boolean;
  handsRemaining: number;
  canDiscardSelection: boolean;
}>();
const emit = defineEmits<{
  'set-selection-mode': [mode: 'automatic' | 'manual'];
  'choose-scoring-option': [id: string];
  'score-hand': [];
  'discard-selected': [];
  'clear-selection': [];
}>();
</script>

<template>
            <div class="space-y-4 rounded-lg border border-default p-4">
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div class="space-y-1">
                  <h3 class="font-semibold text-lg">Poker hand evaluation</h3>
                  <div v-if="preview" data-testid="hand-preview" class="text-sm">
                    <strong>{{ preview.label }}</strong>
                    <template v-if="preview.components">
                      <p class="mt-1 text-xs text-muted">
                        {{ preview.combinationType === 'separate' ? 'Separate formations:' : 'Overlapping formations:' }}
                        <span v-for="(part, index) in preview.components" :key="part.id">
                          {{ index ? ' + ' : '' }}{{ part.label }} ({{ part.baseChips }} × {{ part.multiplier }})
                        </span>
                      </p>
                      <p class="text-xs">
                        {{ preview.combinationType === 'separate'
                          ? `${preview.components[0].score} + ${preview.components[1].score}`
                          : `(${preview.baseChips}) × (${preview.multiplier})` }}
                        = <strong>{{ preview.score }} chips</strong>
                      </p>
                    </template>
                    <p v-else>— {{ preview.baseChips }} chips × {{ preview.multiplier }} multiplier
                      = <strong>{{ preview.score }} chips</strong></p>
                  </div>
                  <p v-else class="text-sm text-muted">Choose 1 to {{ cardsPerPlay }} cards to see the hand type and score.</p>
                </div>
                <UBadge color="neutral" variant="subtle">Base values only</UBadge>
              </div>
              <div  role="group" 
                    aria-label="Play or discard selected cards"
                    class="grid grid-cols-2 gap-1 rounded-lg border border-default bg-elevated/50 p-3">
                <UButton  data-testid="score-hand" aria-label="Play selected cards" title="Play selected cards" 
                          color="success" 
                          variant="solid" 
                          size="xl"
                          icon="i-lucide-play" 
                          class="justify-center px-6 font-bold shadow-md"
                          :disabled="!preview || !inRound || handsRemaining === 0" 
                          @click="emit('score-hand')">
                </UButton>
                <UButton  data-testid="discard-selected" aria-label="Discard selected cards" title="Discard selected cards" 
                          color="warning" 
                          variant="solid" 
                          size="xl"
                          icon="i-lucide-trash-2" 
                          class="justify-center px-6 font-bold shadow-md"
                          :disabled="!canDiscardSelection" 
                          @click="emit('discard-selected')">
                </UButton>
              </div>
              <div  role="group" 
                    aria-label="Clear selected cards"
                    class="grid grid-cols-1 gap-1 rounded-lg border border-default bg-elevated/50 p-3">
                <UButton  data-testid="clear-selection" 
                          class="justify-center px-6 font-bold shadow-md"          
                          color="neutral" variant="outline" size="lg"
                          :disabled="selectedCount === 0" @click="emit('clear-selection')">
                  Clear selection
                </UButton>
              </div>
              <div class="space-y-3 rounded-lg border border-default p-3">
                <div class="flex flex-wrap items-center justify-between gap-3">
                  <div class="space-y-1">
                    <h4 class="font-semibold">Hand selection</h4>
                    <p class="text-xs text-muted">
                      Automatic chooses the highest-ranking formation, not necessarily the highest scoring after upgrades.
                    </p>
                  </div>
                  <UBadge :color="manualUnlocked ? 'success' : 'neutral'" variant="subtle" data-testid="manual-perk-status">
                    {{ manualUnlocked ? 'Manual Selection purchased' : 'Manual Selection locked' }}
                  </UBadge>
                </div>
                <p class="text-xs text-muted">
                  Purchase Manual Hand Selection from the perk shop to enable the Manual mode.
                  Automatic mode is always available.
                </p>
                <div role="group" aria-label="Hand selection mode" class="flex flex-wrap gap-2">
                  <UButton data-testid="automatic-mode" size="sm" :variant="selectionMode === 'automatic' ? 'solid' : 'outline'"
                    @click="emit('set-selection-mode', 'automatic')">Automatic</UButton>
                  <UButton data-testid="manual-mode" size="sm" :variant="selectionMode === 'manual' ? 'solid' : 'outline'"
                    :disabled="!manualUnlocked" @click="emit('set-selection-mode', 'manual')">Manual</UButton>
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
                    :class="!manualUnlocked || selectionMode === 'automatic' ? 'opacity-55' : 'cursor-pointer'">
                    <input type="radio" name="scoring-option" class="mt-1 accent-amber-400"
                      :value="option.id" :checked="preview?.id === option.id"
                      :disabled="!manualUnlocked || selectionMode === 'automatic'"
                      @change="emit('choose-scoring-option', option.id)">
                    <span>{{ option.label }}:
                      <span class="text-muted">{{ option.scoringCardIndices.map(i =>
                        selectedCards[i]!.rank + ' of ' + selectedCards[i]!.suit).join(', ') }}</span>
                      <span class="block text-xs text-muted">{{ option.score }} chips
                        <template v-if="option.components">
                          · {{ option.combinationType === 'separate' ? 'separate scores' : 'combined multiplier' }}
                        </template>
                      </span>
                    </span>
                  </label>
                </div>
                <p v-else class="text-xs text-muted">Choose 1 to {{ cardsPerPlay }} cards to see eligible formations.</p>
              </div>


              <p v-if="scoredHand" data-testid="scored-hand" aria-live="polite" class="text-sm font-semibold text-amber-300">
                Scored {{ scoredHand.label }}: +{{ scoredHand.score }} chips.
              </p>
              <p class="text-xs text-muted">
                Only highlighted cards contribute to scoring, but all {{ selectedCards.length }} committed cards leave your hand.
                Cards discarded using the separate action are replaced without earning chips.
                Chip and perk prices are provisional. Permanent upgrades, card-specific multipliers, and transcendence come later.
              </p>
            </div>
</template>
