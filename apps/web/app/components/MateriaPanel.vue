<script setup lang="ts">
import { computed, ref } from 'vue';
import { MATERIA_KINDS, materiaLevel, spellCost, type MateriaState } from '@pokermanic/engine';
const props = defineProps<{ materia: MateriaState; targetReady: boolean; phase: string; mode: 'inventory' | 'spells' }>();
const emit = defineEmits<{
  equip: [id: number, slot: number]; unequip: [slot: number];
  cast: [id: number, tier: number]; breakFreeze: [];
}>();
const expanded = ref<number | null>(null);
const selectedTier = ref<Record<number,number>>({});
const target = ref<number>(0);
const equipped = computed(() => props.materia.equipped.flatMap(id => {
  const gem = props.materia.collection.find(g => g.id === id);
  return gem ? [gem] : [];
}));
const spells = computed(() => equipped.value.filter(g => ['fire','ice','lightning'].includes(g.kind)));
const costFor = (id: number, tier: number) => {
  const gem = equipped.value.find(g => g.id === id)!;
  return spellCost(gem.kind as 'fire'|'ice'|'lightning',materiaLevel(gem),tier);
};
</script>
<template>
  <div class="space-y-3">
    <section v-if="mode === 'inventory'" aria-label="Materia inventory" class="space-y-2">
      <h3 class="font-semibold">Materia Inventory</h3>
      <p v-if="!materia.collection.length" class="text-sm text-muted">Win rounds to discover Materia. Equip it here after discovery.</p>
      <div v-for="gem in materia.collection" :key="gem.id" class="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-default p-2">
        <div class="flex min-w-0 items-center gap-3">
          <UTooltip :text="MATERIA_KINDS[gem.kind].name + ' · ' + MATERIA_KINDS[gem.kind].description">
            <span class="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2"
              :class="MATERIA_KINDS[gem.kind].color === 'blue' ? 'border-blue-400 bg-blue-800' : MATERIA_KINDS[gem.kind].color === 'purple' ? 'border-purple-400 bg-purple-800' : 'border-green-400 bg-green-800'"
              :aria-label="MATERIA_KINDS[gem.kind].name + ', level ' + materiaLevel(gem) + '. ' + MATERIA_KINDS[gem.kind].description" tabindex="0">
              <UIcon :name="MATERIA_KINDS[gem.kind].icon" class="h-5 w-5 text-white" aria-hidden="true" />
              <span class="absolute -right-1 -top-1 rounded-full bg-amber-200 px-1 text-[10px] font-bold leading-4 text-slate-950">{{ materiaLevel(gem) }}</span>
            </span>
          </UTooltip>
          <div class="min-w-0">
            <p class="font-medium">{{ MATERIA_KINDS[gem.kind].name }}</p>
            <p class="text-xs text-muted">{{ MATERIA_KINDS[gem.kind].description }}</p>
            <p class="text-xs text-muted">{{ gem.xp }} XP</p>
          </div>
        </div>
        <div class="flex flex-wrap gap-1">
          <template v-for="(slot,i) in materia.equipped" :key="i">
            <UButton v-if="slot === gem.id" size="xs" color="success" variant="outline"
              @click="emit('unequip',i)">Unequip slot {{ i+1 }}</UButton>
            <UButton v-else size="xs" color="neutral" variant="outline"
              @click="emit('equip',gem.id,i)">Equip slot {{ i+1 }}</UButton>
          </template>
        </div>
      </div>
    </section>
    <section v-if="mode === 'spells'" aria-label="Spells" class="space-y-2">
      <h3 class="font-semibold">Spells · {{ materia.mp }} MP</h3>
      <p class="text-xs text-muted">Select exactly one card before casting. You can cast any spell repeatedly while you have enough MP.</p>
      <div v-for="gem in spells" :key="gem.id" class="rounded-lg border border-default overflow-hidden">
        <button class="flex w-full items-center justify-between p-3 text-left font-medium"
          :aria-expanded="expanded===gem.id" @click="expanded=expanded===gem.id?null:gem.id">
          {{ MATERIA_KINDS[gem.kind].name }} <span>{{ expanded===gem.id?'⌄':'›' }}</span>
        </button>
        <div v-if="expanded===gem.id" class="space-y-2 border-t border-default p-3">
          <label v-for="tier in materiaLevel(gem)" :key="tier" class="flex items-center gap-2 text-sm">
            <input type="radio" :name="'spell-'+gem.id" :checked="(selectedTier[gem.id] ?? 1)===tier" @change="selectedTier[gem.id]=tier" />
            {{ MATERIA_KINDS[gem.kind].name }} {{ ['I','II','III','IV'][tier-1] }} — {{ costFor(gem.id,tier) }} MP
          </label>
          <UButton size="sm" :disabled="phase!=='playing'||!targetReady||materia.mp<costFor(gem.id,selectedTier[gem.id]??1)"
            @click="emit('cast',gem.id,selectedTier[gem.id]??1)">Cast on selected card</UButton>
          <p v-if="materia.mp < costFor(gem.id,selectedTier[gem.id]??1)" class="text-xs text-amber-300">Not enough MP</p>
        </div>
      </div>
      <p v-if="!spells.length" class="text-xs text-muted">Equip Fire, Ice or Lightning to unlock spells.</p>
      <UButton size="xs" color="neutral" variant="outline" :disabled="!targetReady" @click="emit('breakFreeze')">Break Freeze on selected card</UButton>
    </section>
  </div>
</template>
