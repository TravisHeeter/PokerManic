<script setup lang="ts">
import { computed } from 'vue';
import { MATERIA_KINDS, materiaLevel, type MateriaState } from '@pokermanic/engine';
const props = defineProps<{ materia: MateriaState; links: number[] }>();
const slots = computed(() => props.materia.equipped.map((id,index) => ({
  index, gem: props.materia.collection.find(item => item.id === id)
})));
</script>
<template>
  <section data-testid="materia-board" aria-label="Equipped Materia" class="rounded-xl border border-default bg-elevated/40 p-3 space-y-2">
    <div class="flex items-center justify-between gap-2">
      <h3 class="text-sm font-semibold">Materia Board</h3>
      <span class="text-sm font-semibold text-sky-300">MP {{ materia.mp }} / 50</span>
    </div>
    <div class="flex flex-wrap items-center gap-2">
      <template v-for="(slot,i) in slots" :key="slot.index">
        <div v-if="i > 0" :class="links.includes(Math.floor((i-1)/2)) && i % 2 === 1 ? 'bg-amber-400 h-1 w-6 rounded' : 'bg-muted h-px w-3'" aria-hidden="true" />
        <div class="flex flex-col items-center gap-1">
          <div class="flex h-11 w-11 items-center justify-center rounded-full border-2 shadow-inner"
            :class="slot.gem ? slot.gem.kind === 'rank' || slot.gem.kind === 'hand' || slot.gem.kind === 'suits' ? 'bg-blue-800 border-blue-400' : slot.gem.kind === 'fortune' ? 'bg-purple-800 border-purple-400' : 'bg-green-800 border-green-400' : 'border-default bg-muted/20'"
            :title="slot.gem ? MATERIA_KINDS[slot.gem.kind].name : 'Empty slot'">
            <span v-if="slot.gem" class="text-white font-bold">{{ MATERIA_KINDS[slot.gem.kind].name.slice(0,2) }}</span>
            <span v-else class="text-muted">+</span>
          </div>
          <span class="text-[10px] text-muted">{{ slot.gem ? 'Lv ' + materiaLevel(slot.gem) : 'Slot ' + (i+1) }}</span>
          <span v-if="slot.gem && materia.castThisRound.includes(slot.gem.id)" class="text-[10px] text-amber-300">Used</span>
        </div>
      </template>
    </div>
  </section>
</template>
