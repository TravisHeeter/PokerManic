<script setup lang="ts">
import { computed, ref, onBeforeUnmount } from 'vue';
import { MATERIA_KINDS, materiaLevel, spellCost, type MateriaState } from '@pokermanic/engine';
const props = defineProps<{ materia: MateriaState; links: number[]; targetReady: boolean; phase: string }>();
const emit = defineEmits<{ 'show-info': [id: number]; cast: [id: number, tier: number]; 'drop-cast': [id: number, tier: number, index: number] }>();

const opened = ref<number | null>(null);
let touchDrag: { id: number; x: number; y: number } | null = null;
let suppressClick = false;
function openGem(id: number) {
  if (suppressClick) { suppressClick = false; return; }
  opened.value = opened.value === id ? null : id;
}
function touchStart(event: PointerEvent, id: number) {
  if (event.pointerType === 'mouse' || !props.materia.collection.some(g => g.id === id && castable(g.kind))) return;
  touchDrag = { id, x: event.clientX, y: event.clientY };
  window.addEventListener('pointerup', touchEnd, { once: true });
}
function touchEnd(event: PointerEvent) {
  const drag = touchDrag;
  touchDrag = null;
  if (!drag || Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 20) return;
  suppressClick = true;
  const card = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-materia-card-index]');
  const index = Number(card?.getAttribute('data-materia-card-index'));
  if (card && Number.isInteger(index)) {
    opened.value = null;
    emit('drop-cast', drag.id, 1, index);
  }
}
onBeforeUnmount(() => window.removeEventListener('pointerup', touchEnd));
const castable = (kind: string) => ['fire','ice','lightning'].includes(kind);
function startDrag(event: DragEvent, id: number) {
  if (!event.dataTransfer) return;
  event.dataTransfer.setData('application/x-pokermanic-materia', String(id));
  event.dataTransfer.setData('text/plain', String(id));
  event.dataTransfer.effectAllowed = 'copy';
  opened.value = null;
}
const cost = (kind: string, level: number, tier: number) => spellCost(kind as 'fire'|'ice'|'lightning', level, tier);
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
          <div v-if="slot.gem" class="relative">
            <button type="button" class="relative flex h-11 w-11 items-center justify-center rounded-full border-2 shadow-inner cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
              :class="MATERIA_KINDS[slot.gem.kind].color === 'blue' ? 'bg-blue-800 border-blue-400' : MATERIA_KINDS[slot.gem.kind].color === 'purple' ? 'bg-purple-800 border-purple-400' : 'bg-green-800 border-green-400'"
              :aria-label="MATERIA_KINDS[slot.gem.kind].name + ', level ' + materiaLevel(slot.gem) + '. ' + MATERIA_KINDS[slot.gem.kind].description"
              :draggable="castable(slot.gem.kind)"
              @dragstart="startDrag($event, slot.gem.id)"
              :style="castable(slot.gem.kind) ? { touchAction: 'none' } : undefined"
              @pointerdown="touchStart($event, slot.gem.id)"
              @click="openGem(slot.gem.id)">
              <UIcon :name="MATERIA_KINDS[slot.gem.kind].icon" class="h-6 w-6 text-white" aria-hidden="true" />
              <span class="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-200 px-0.5 text-[10px] font-bold leading-none text-slate-950 shadow ring-1 ring-slate-900" :aria-label="'Level ' + materiaLevel(slot.gem)">
                {{ materiaLevel(slot.gem) }}
              </span>
            </button>
            <div v-if="opened === slot.gem.id" role="menu" :aria-label="MATERIA_KINDS[slot.gem.kind].name + ' spells'"
              class="absolute bottom-full left-0 z-[100] mb-2 w-52 space-y-1 rounded-lg border border-default bg-elevated p-2 shadow-xl">
              <p class="text-xs font-semibold">{{ MATERIA_KINDS[slot.gem.kind].name }}</p>
              <template v-if="castable(slot.gem.kind)">
                <UButton v-for="tier in materiaLevel(slot.gem)" :key="tier" size="xs" block
                  :disabled="phase !== 'playing' || !targetReady || materia.mp < cost(slot.gem.kind, materiaLevel(slot.gem), tier)"
                  @click="emit('cast', slot.gem.id, tier); opened = null">
                  Cast {{ ['I','II','III','IV'][tier-1] }} · {{ cost(slot.gem.kind, materiaLevel(slot.gem), tier) }} MP
                </UButton>
                <p v-if="!targetReady" class="text-xs text-muted">Select one card or drag onto a card.</p>
              </template>
              <p v-else class="text-xs text-muted">This Materia has no direct spell.</p>
              <UButton size="xs" color="neutral" variant="outline" block @click="emit('show-info', slot.gem.id); opened = null">More</UButton>
              <UButton size="xs" color="neutral" variant="ghost" block @click="opened = null">Close</UButton>
            </div>
          </div>
          <div v-else class="flex h-11 w-11 items-center justify-center rounded-full border-2 border-default bg-muted/20 text-muted" :aria-label="'Empty Materia slot ' + (i+1)">+</div>
          <span v-if="slot.gem && materia.castThisRound.includes(slot.gem.id)" class="text-[10px] text-amber-300">Cast ×{{ materia.castThisRound.filter(id => id === slot.gem?.id).length }}</span>
        </div>
      </template>
    </div>
  </section>
</template>
