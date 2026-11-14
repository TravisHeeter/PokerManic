<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { MATERIA_KINDS, type MateriaKind, type MateriaState } from '@pokermanic/engine';

const props = defineProps<{ materia: MateriaState }>();
const emit = defineEmits<{ acquire: [kind: MateriaKind, slot: number | null] }>();
const open = computed(() => props.materia.offers.length > 0);
const selected = ref<MateriaKind | null>(null);
const selectedIndex = ref<number | null>(null);
watch(() => props.materia.offers, offers => {
  if (!offers.length) {
    selected.value = null;
    selectedIndex.value = null;
  } else if (!offers.includes(selected.value as MateriaKind)) {
    selected.value = null;
    selectedIndex.value = null;
  }
});
function choose(kind: MateriaKind, index: number) {
  selected.value = kind;
  selectedIndex.value = index;
}
function acquire(slot: number | null) {
  if (selected.value === null || selectedIndex.value === null) return;
  if (props.materia.offers[selectedIndex.value] !== selected.value) return;
  emit('acquire', selected.value, slot);
}
const occupiedName = (id: number | null) =>
  props.materia.collection.find(gem => gem.id === id)?.kind;
</script>

<template>
  <UModal :open="open" :dismissible="false" title="Materia discovered!"
    description="Choose a new Materia, then equip it or send it to storage."
    :ui="{ content: 'w-[calc(100vw-1rem)] sm:max-w-lg max-h-[90dvh] flex flex-col', body: 'min-h-0 overflow-y-auto overscroll-contain' }">
    <template #body>
      <section data-testid="materia-discovery-modal" class="space-y-4">
        <p class="text-sm text-muted">Choose one Materia to keep. Your other discoveries will disappear.</p>
        <div class="grid grid-cols-3 gap-2">
          <button v-for="(kind, index) in materia.offers" :key="index" type="button"
            :data-testid="`discovery-option-${index}`"
            :aria-pressed="selectedIndex === index"
            class="min-w-0 rounded-xl border p-3 text-center focus-visible:outline-2 focus-visible:outline-amber-300"
            :class="selectedIndex === index ? 'border-amber-300 bg-amber-300/10' : 'border-default bg-elevated/30'"
            @click="choose(kind,index)">
            <span class="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-bold text-white"
              :class="MATERIA_KINDS[kind].color === 'blue' ? 'border-blue-400 bg-blue-800' : MATERIA_KINDS[kind].color === 'purple' ? 'border-purple-400 bg-purple-800' : 'border-green-400 bg-green-800'">
              {{ MATERIA_KINDS[kind].name.slice(0, 2) }}
            </span>
            <span class="block break-words text-sm font-medium">{{ MATERIA_KINDS[kind].name }}</span>
            <span class="block text-xs text-muted">Level 1</span>
          </button>
        </div>
        <div v-if="selected !== null" class="space-y-3 border-t border-default pt-3">
          <p class="text-sm font-semibold">What would you like to do with {{ MATERIA_KINDS[selected].name }}?</p>
          <UButton data-testid="discovery-store" block color="neutral" variant="outline" @click="acquire(null)">
            Send to storage
          </UButton>
          <div class="space-y-2">
            <p class="text-xs text-muted">Equip now (you can rearrange Materia later):</p>
            <UButton v-for="(id, slot) in materia.equipped" :key="slot" block
              :data-testid="`discovery-equip-${slot}`"
              color="success" variant="outline" @click="acquire(slot)">
              {{ id === null ? `Equip in empty slot ${slot + 1}` : `Replace ${MATERIA_KINDS[occupiedName(id) ?? 'fire'].name} in slot ${slot + 1}` }}
            </UButton>
            <p v-if="materia.equipped.every(id => id !== null)" class="text-xs text-amber-300">
              Equipping into an occupied slot moves its previous Materia to storage.
            </p>
          </div>
        </div>
        <p v-else class="text-xs text-muted">Select a Materia above to reveal your options.</p>
      </section>
    </template>
  </UModal>
</template>
