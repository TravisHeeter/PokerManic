<script setup lang="ts">
import { ref } from 'vue';
import { MATERIA_KINDS, materiaLevel, type MateriaKind, type MateriaState } from '@pokermanic/engine';

const props = defineProps<{ materia: MateriaState }>();
const emit = defineEmits<{
  add: [kind: MateriaKind, level: number];
  'set-kind': [id: number, kind: MateriaKind];
  'set-level': [id: number, level: number];
  equip: [id: number, slot: number];
  unequip: [slot: number];
  remove: [id: number];
}>();
const kinds = Object.keys(MATERIA_KINDS) as MateriaKind[];
const newKind = ref<MateriaKind>('fire');
const newLevel = ref(1);
const selectedKind = (event: Event) => (event.target as HTMLSelectElement).value as MateriaKind;
const selectedLevel = (event: Event) => Number((event.target as HTMLSelectElement).value);
const selectedSlot = (event: Event) => Number((event.target as HTMLSelectElement).value);
const slotFor = (id: number) => props.materia.equipped.indexOf(id);
</script>

<template>
  <section data-testid="god-materia-editor" class="space-y-3 rounded-lg border border-default p-3">
    <div class="space-y-1">
      <h3 class="text-lg font-semibold">Materia editor</h3>
      <p class="text-xs text-muted">Add any Materia, change its type and level, equip it, or remove it. Changes apply immediately and autosave. Levels are converted to the XP required for that level.</p>
    </div>
    <div class="flex flex-wrap items-end gap-2 rounded-lg bg-elevated/40 p-2">
      <label class="min-w-32 flex-1 space-y-1 text-xs">
        <span>Materia type</span>
        <select data-testid="god-new-materia-kind" v-model="newKind"
          class="w-full rounded-md border border-default bg-default px-2 py-2 text-sm">
          <option v-for="kind in kinds" :key="kind" :value="kind">{{ MATERIA_KINDS[kind].name }}</option>
        </select>
      </label>
      <label class="w-24 space-y-1 text-xs">
        <span>Level</span>
        <select data-testid="god-new-materia-level" v-model.number="newLevel"
          class="w-full rounded-md border border-default bg-default px-2 py-2 text-sm">
          <option v-for="level in MATERIA_KINDS[newKind].maxLevel" :key="level" :value="level">{{ level }}</option>
        </select>
      </label>
      <UButton data-testid="god-add-materia" color="success" @click="emit('add', newKind, Math.min(newLevel, MATERIA_KINDS[newKind].maxLevel))">Add Materia</UButton>
    </div>

    <p v-if="!materia.collection.length" class="text-sm text-muted">No Materia owned. Add one above to start experimenting.</p>
    <div v-for="gem in materia.collection" :key="gem.id" class="space-y-2 rounded-lg border border-default p-3" :data-testid="`god-materia-${gem.id}`">
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <UIcon :name="MATERIA_KINDS[gem.kind].icon" class="h-5 w-5" aria-hidden="true" />
          <span class="text-sm font-semibold">{{ MATERIA_KINDS[gem.kind].name }} #{{ gem.id }}</span>
        </div>
        <span class="text-xs text-muted">{{ gem.xp }} XP · {{ slotFor(gem.id) < 0 ? 'In storage' : 'Slot ' + (slotFor(gem.id) + 1) }}</span>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <label class="space-y-1 text-xs">
          <span>Type</span>
          <select :data-testid="`god-materia-kind-${gem.id}`" :value="gem.kind" @change="emit('set-kind', gem.id, selectedKind($event))"
            class="w-full rounded-md border border-default bg-default px-2 py-2 text-sm">
            <option v-for="kind in kinds" :key="kind" :value="kind">{{ MATERIA_KINDS[kind].name }}</option>
          </select>
        </label>
        <label class="space-y-1 text-xs">
          <span>Level</span>
          <select :data-testid="`god-materia-level-${gem.id}`" :value="materiaLevel(gem)" @change="emit('set-level', gem.id, selectedLevel($event))"
            class="w-full rounded-md border border-default bg-default px-2 py-2 text-sm">
            <option v-for="level in MATERIA_KINDS[gem.kind].maxLevel" :key="level" :value="level">{{ level }}</option>
          </select>
        </label>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <label class="min-w-32 flex-1 space-y-1 text-xs">
          <span>Equipped slot</span>
          <select :data-testid="`god-materia-slot-${gem.id}`" :value="slotFor(gem.id)"
            @change="emit(selectedSlot($event) < 0 ? 'unequip' : 'equip', ...(selectedSlot($event) < 0 ? [slotFor(gem.id)] : [gem.id, selectedSlot($event)]) as never)"
            class="w-full rounded-md border border-default bg-default px-2 py-2 text-sm">
            <option :value="-1">Storage / Unequipped</option>
            <option v-for="(_, index) in materia.equipped" :key="index" :value="index">Slot {{ index + 1 }}</option>
          </select>
        </label>
        <UButton :data-testid="`god-remove-materia-${gem.id}`" color="error" variant="outline" size="sm" @click="emit('remove', gem.id)">Remove</UButton>
      </div>
    </div>
  </section>
</template>
