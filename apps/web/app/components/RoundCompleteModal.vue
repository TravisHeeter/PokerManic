<script setup lang="ts">
import { computed } from 'vue';
import { MATERIA_KINDS, MAX_MP, type MateriaState } from '@pokermanic/engine';

const props = defineProps<{
  open: boolean;
  round: number;
  score: number;
  required: number;
  materia: MateriaState;
}>();
const emit = defineEmits<{ continue: [] }>();
const formatScore = (value: number) => value.toLocaleString('en-US');
const equippedGems = computed(() => {
  const equipped = new Set(props.materia.equipped.filter((id): id is number => id !== null));
  return props.materia.collection.filter(gem => equipped.has(gem.id));
});
const xpPerGem = 20; // completeMateriaRound awards 20 XP to every equipped gem on a win.
const totalXp = computed(() => equippedGems.value.length * xpPerGem);
// MP is not awarded on victory; newMateriaRound replenishes it up to MAX_MP.
const mpRefill = computed(() => Math.max(0, MAX_MP - props.materia.mp));
</script>

<template>
  <UModal :open="open" :dismissible="false" :title="`Round ${round} complete!`"
    description="Target reached. Here's how you did."
    :ui="{ content: 'w-[calc(100vw-1rem)] sm:max-w-md max-h-[90dvh] flex flex-col', body: 'min-h-0 overflow-y-auto overscroll-contain' }">
    <template #body>
      <section data-testid="round-complete-modal" class="space-y-4">
        <div class="rounded-xl border border-amber-400/40 bg-amber-400/10 p-4 text-center">
          <p class="text-xs font-semibold uppercase tracking-widest text-amber-300">Your score</p>
          <p class="text-4xl font-bold tabular-nums">{{ formatScore(score) }}</p>
          <p class="mt-1 text-sm text-muted">Required: {{ formatScore(required) }} chips</p>
          <p class="mt-1 text-sm text-green-300">+{{ formatScore(score - required) }} over target</p>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div class="rounded-lg border border-default p-3">
            <p class="text-xs text-muted">Materia XP earned</p>
            <p class="text-2xl font-semibold text-amber-300">+{{ totalXp }}</p>
            <p class="text-xs text-muted">+20 per equipped Materia</p>
          </div>
          <div class="rounded-lg border border-default p-3">
            <p class="text-xs text-muted">MP replenished next round</p>
            <p class="text-2xl font-semibold text-sky-300">+{{ mpRefill }}</p>
            <p class="text-xs text-muted">Refills to {{ MAX_MP }} MP at round start</p>
          </div>
        </div>
        <div v-if="equippedGems.length" class="space-y-2">
          <p class="text-xs font-semibold text-muted">XP awarded to equipped Materia</p>
          <div class="flex flex-wrap gap-2">
            <div v-for="gem in equippedGems" :key="gem.id" class="flex items-center gap-1.5 rounded-full border border-default px-2.5 py-1 text-xs">
              <UIcon :name="MATERIA_KINDS[gem.kind].icon" class="h-4 w-4" />
              <span>{{ MATERIA_KINDS[gem.kind].name }} +20 XP</span>
            </div>
          </div>
        </div>
        <p v-else class="text-xs text-muted">Equip Materia to earn XP on future round victories.</p>
        <UButton data-testid="next-round" block color="success" size="lg" @click="emit('continue')">
          Next round
        </UButton>
      </section>
    </template>
  </UModal>
</template>
