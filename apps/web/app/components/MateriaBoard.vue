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
          <UTooltip v-if="slot.gem" :text="MATERIA_KINDS[slot.gem.kind].name + ' · ' + MATERIA_KINDS[slot.gem.kind].description">
            <div class="relative flex h-11 w-11 items-center justify-center rounded-full border-2 shadow-inner"
              :class="slot.gem.kind === 'rank' || slot.gem.kind === 'hand' || slot.gem.kind === 'suits' ? 'bg-blue-800 border-blue-400' : slot.gem.kind === 'fortune' ? 'bg-purple-800 border-purple-400' : 'bg-green-800 border-green-400'"
              :aria-label="MATERIA_KINDS[slot.gem.kind].name + ', level ' + materiaLevel(slot.gem) + '. ' + MATERIA_KINDS[slot.gem.kind].description"
              tabindex="0">
              <UIcon :name="MATERIA_KINDS[slot.gem.kind].icon" class="h-6 w-6 text-white" aria-hidden="true" />
              <span class="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-200 px-0.5 text-[10px] font-bold leading-none text-slate-950 shadow ring-1 ring-slate-900" :aria-label="'Level ' + materiaLevel(slot.gem)">
                {{ materiaLevel(slot.gem) }}
              </span>
            </div>
          </UTooltip>
          <div v-else class="flex h-11 w-11 items-center justify-center rounded-full border-2 border-default bg-muted/20 text-muted" :aria-label="'Empty Materia slot ' + (i+1)">+</div>
          <span v-if="slot.gem && materia.castThisRound.includes(slot.gem.id)" class="text-[10px] text-amber-300">Cast ×{{ materia.castThisRound.filter(id => id === slot.gem?.id).length }}</span>
        </div>
      </template>
    </div>
  </section>
</template>
