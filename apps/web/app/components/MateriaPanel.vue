<script setup lang="ts">
import { computed, ref } from 'vue';
import { MATERIA_KINDS, materiaLevel, spellCost, type MateriaKind, type MateriaState } from '@pokermanic/engine';
const props = defineProps<{ materia: MateriaState; targetReady: boolean; phase: string }>();
const emit = defineEmits<{
  equip: [id: number, slot: number]; unequip: [slot: number];
  cast: [id: number, tier: number]; claim: [kind: MateriaKind]; breakFreeze: [];
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
    <div v-if="materia.offers.length" class="rounded-lg border border-amber-400/50 p-3 space-y-2">
      <h3 class="font-semibold text-amber-300">Round cleared — discover Materia</h3>
      <p class="text-xs text-muted">Choose one reward:</p>
      <div class="flex flex-wrap gap-2">
        <UButton v-for="(kind,i) in materia.offers" :key="i" size="sm" color="success" variant="outline" @click="emit('claim',kind)">
          {{ MATERIA_KINDS[kind].name }}
        </UButton>
      </div>
    </div>
    <section aria-label="Materia inventory" class="space-y-2">
      <h3 class="font-semibold">Materia Inventory</h3>
      <p v-if="!materia.collection.length" class="text-sm text-muted">Win rounds to discover Materia. Equip it here after discovery.</p>
      <div v-for="gem in materia.collection" :key="gem.id" class="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-default p-2">
        <div>
          <p class="font-medium">{{ MATERIA_KINDS[gem.kind].name }} · Lv {{ materiaLevel(gem) }}</p>
          <p class="text-xs text-muted">{{ gem.xp }} XP</p>
        </div>
        <div class="flex flex-wrap gap-1">
          <UButton v-for="(slot,i) in materia.equipped" :key="i" size="xs"
            :color="slot === gem.id ? 'success' : 'neutral'" variant="outline"
            :disabled="slot === gem.id" @click="emit('equip',gem.id,i)">
            {{ slot === gem.id ? 'Equipped ' : 'Slot ' }}{{ i+1 }}
          </UButton>
        </div>
      </div>
    </section>
    <section aria-label="Spells" class="space-y-2">
      <h3 class="font-semibold">Spells · {{ materia.mp }} MP</h3>
      <p class="text-xs text-muted">Select exactly one card in your hand before casting. Each Materia may cast once per round.</p>
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
          <UButton size="sm" :disabled="phase!=='playing'||!targetReady||materia.castThisRound.includes(gem.id)||materia.mp<costFor(gem.id,selectedTier[gem.id]??1)"
            @click="emit('cast',gem.id,selectedTier[gem.id]??1)">Cast on selected card</UButton>
          <p v-if="materia.castThisRound.includes(gem.id)" class="text-xs text-amber-300">Already cast this round</p>
        </div>
      </div>
      <p v-if="!spells.length" class="text-xs text-muted">Equip Fire, Ice or Lightning to unlock spells.</p>
      <UButton size="xs" color="neutral" variant="outline" :disabled="!targetReady" @click="emit('breakFreeze')">Break Freeze on selected card</UButton>
    </section>
  </div>
</template>
