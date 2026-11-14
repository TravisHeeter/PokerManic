<script setup lang="ts">
import { computed } from 'vue';
import { MATERIA_KINDS, XP_LEVELS, materiaLevel, type MateriaGem } from '@pokermanic/engine';

const props = defineProps<{ gem: MateriaGem | null; open: boolean }>();
const emit = defineEmits<{ close: [] }>();
const details = computed(() => props.gem ? MATERIA_KINDS[props.gem.kind] : null);
const level = computed(() => props.gem ? materiaLevel(props.gem) : 1);
const nextThreshold = computed(() => {
  if (!details.value || level.value >= details.value.maxLevel) return null;
  return XP_LEVELS[level.value] ?? null;
});
const previousThreshold = computed(() => XP_LEVELS[level.value - 1] ?? 0);
const progress = computed(() => {
  if (!props.gem || nextThreshold.value === null) return 100;
  const range = nextThreshold.value - previousThreshold.value;
  return range > 0 ? Math.max(0, Math.min(100, (props.gem.xp - previousThreshold.value) / range * 100)) : 100;
});
</script>

<template>
  <UModal :open="open" title="Materia details"
    :description="details ? details.name + ' Materia — level ' + level : 'Materia information'"
    :ui="{ content: 'w-[calc(100vw-1rem)] sm:max-w-md max-h-[90dvh] flex flex-col', body: 'min-h-0 overflow-y-auto overscroll-contain' }"
    @update:open="value => { if (!value) emit('close'); }">
    <template #body>
      <section v-if="gem && details" data-testid="materia-details-modal" class="space-y-4">
        <div class="flex items-center gap-3">
          <div class="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2"
            :class="details.color === 'blue' ? 'border-blue-400 bg-blue-800' : details.color === 'purple' ? 'border-purple-400 bg-purple-800' : 'border-green-400 bg-green-800'">
            <UIcon :name="details.icon" class="h-7 w-7 text-white" aria-hidden="true" />
          </div>
          <div>
            <h3 class="text-xl font-bold">{{ details.name }}</h3>
            <p class="text-sm text-muted">Level {{ level }} / {{ details.maxLevel }}</p>
          </div>
        </div>
        <p class="text-sm">{{ details.description }}</p>
        <div class="space-y-2 rounded-lg border border-default p-3">
          <div class="flex items-center justify-between gap-3 text-sm">
            <span class="font-medium">Current XP</span>
            <strong class="tabular-nums">{{ gem.xp.toLocaleString('en-US') }} XP</strong>
          </div>
          <template v-if="nextThreshold !== null">
            <div class="flex items-center justify-between gap-3 text-sm">
              <span>Next level at</span>
              <strong class="tabular-nums">{{ nextThreshold.toLocaleString('en-US') }} XP</strong>
            </div>
            <div class="flex items-center justify-between gap-3 text-sm">
              <span>XP needed</span>
              <strong class="tabular-nums">{{ Math.max(0, nextThreshold - gem.xp).toLocaleString('en-US') }} XP</strong>
            </div>
            <progress :value="progress" max="100" class="h-2 w-full accent-amber-400" aria-label="Materia XP progress to next level" />
          </template>
          <p v-else class="text-sm text-green-300">Maximum level reached</p>
        </div>
        <UButton block color="neutral" variant="outline" @click="emit('close')">Close</UButton>
      </section>
    </template>
  </UModal>
</template>
