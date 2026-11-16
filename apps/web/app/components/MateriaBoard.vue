<script setup lang="ts">
import { computed, ref, onBeforeUnmount } from 'vue';
import { MATERIA_KINDS, materiaLevel, spellCost, type MateriaState } from '@pokermanic/engine';
const props = defineProps<{ materia: MateriaState; links: number[]; targetReady: boolean; phase: string }>();
const emit = defineEmits<{ 'show-info': [id: number]; cast: [id: number, tier: number]; 'drop-cast': [id: number, tier: number, index: number] }>();

const opened = ref<number | null>(null);
const armed = ref<{ id: number; tier: number } | null>(null);
function chooseSpell(id: number, tier: number) {
  armed.value = { id, tier };
  opened.value = null;
}
function dragTier(id: number): number | null {
  return armed.value?.id === id ? armed.value.tier : null;
}
let touchDrag: { id: number; x: number; y: number } | null = null;
let suppressClick = false;
let ghost: HTMLDivElement | null = null;
let hovered: HTMLElement | null = null;
function setHovered(element: HTMLElement | null) {
  if (hovered === element) return;
  hovered?.removeAttribute('data-materia-hover');
  hovered = element;
  hovered?.setAttribute('data-materia-hover', 'true');
}
function clearDragVisuals() {
  setHovered(null);
  ghost?.remove();
  ghost = null;
}
function moveTouch(event: PointerEvent) {
  if (!touchDrag) return;
  if (!ghost && Math.hypot(event.clientX - touchDrag.x, event.clientY - touchDrag.y) < 12) return;
  if (!ghost) {
    const source = document.querySelector<HTMLElement>(`[data-materia-source="${touchDrag.id}"]`);
    if (!source) return;
    ghost = document.createElement('div');
    ghost.className = 'pointer-events-none fixed z-[9999] flex h-12 w-12 items-center justify-center rounded-full border-2 border-amber-300 bg-slate-800 shadow-[0_0_22px_rgba(251,191,36,0.85)]';
    ghost.innerHTML = source.innerHTML;
    ghost.setAttribute('aria-hidden', 'true');
    document.body.appendChild(ghost);
    opened.value = null;
  }
  ghost.style.left = `${event.clientX - 24}px`;
  ghost.style.top = `${event.clientY - 24}px`;
  const element = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-materia-card-index]');
  setHovered(element ?? null);
}
function openGem(id: number) {
  if (suppressClick) { suppressClick = false; return; }
  opened.value = opened.value === id ? null : id;
}
function touchStart(event: PointerEvent, id: number) {
  if (event.pointerType === 'mouse' || dragTier(id) === null || props.phase !== 'playing') return;
  touchDrag = { id, x: event.clientX, y: event.clientY };
  window.addEventListener('pointermove', moveTouch);
  window.addEventListener('pointerup', touchEnd, { once: true });
  window.addEventListener('pointercancel', cancelTouch, { once: true });
}
function cancelTouch() {
  touchDrag = null;
  window.removeEventListener('pointermove', moveTouch);
  clearDragVisuals();
}
function touchEnd(event: PointerEvent) {
  const drag = touchDrag;
  touchDrag = null;
  window.removeEventListener('pointermove', moveTouch);
  clearDragVisuals();
  if (!drag || Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 20) return;
  suppressClick = true;
  const card = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-materia-card-index]');
  const index = Number(card?.getAttribute('data-materia-card-index'));
  if (card && Number.isInteger(index)) {
    opened.value = null;
    const tier = dragTier(drag.id);
    if (tier !== null) emit('drop-cast', drag.id, tier, index);
  }
}
onBeforeUnmount(() => {
  window.removeEventListener('pointerup', touchEnd);
  window.removeEventListener('pointermove', moveTouch);
  window.removeEventListener('pointercancel', cancelTouch);
  clearDragVisuals();
});
const castable = (kind: string) => ['fire','ice','lightning'].includes(kind);
function endDrag() { document.documentElement.removeAttribute('data-materia-dragging'); }
function startDrag(event: DragEvent, id: number) {
  const tier = dragTier(id);
  if (!event.dataTransfer || tier === null || props.phase !== 'playing') { event.preventDefault(); return; }
  event.dataTransfer.setData('application/x-pokermanic-materia', JSON.stringify({ id, tier }));
  event.dataTransfer.setData('text/plain', String(id));
  event.dataTransfer.effectAllowed = 'copy';
  document.documentElement.setAttribute('data-materia-dragging', 'true');
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
              :aria-label="MATERIA_KINDS[slot.gem.kind].name + ', level ' + materiaLevel(slot.gem) + '. ' + MATERIA_KINDS[slot.gem.kind].description"
              :draggable="dragTier(slot.gem.id) !== null && phase === 'playing'"
              :data-materia-source="slot.gem.id"
              :data-spell-armed="dragTier(slot.gem.id) !== null ? 'true' : undefined"
              :class="[MATERIA_KINDS[slot.gem.kind].color === 'blue' ? 'bg-blue-800 border-blue-400' : MATERIA_KINDS[slot.gem.kind].color === 'purple' ? 'bg-purple-800 border-purple-400' : 'bg-green-800 border-green-400', dragTier(slot.gem.id) !== null ? 'ring-2 ring-amber-300 ring-offset-2 ring-offset-slate-900' : '']"
              @dragend="endDrag"
              @dragstart="startDrag($event, slot.gem.id)"
              :style="dragTier(slot.gem.id) !== null ? { touchAction: 'none' } : undefined"
              @pointerdown="touchStart($event, slot.gem.id)"
              @click="openGem(slot.gem.id)">
              <UIcon :name="MATERIA_KINDS[slot.gem.kind].icon" class="h-6 w-6 text-white" aria-hidden="true" />
              <span class="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-200 px-0.5 text-[10px] font-bold leading-none text-slate-950 shadow ring-1 ring-slate-900" :aria-label="'Level ' + materiaLevel(slot.gem)">
                {{ materiaLevel(slot.gem) }}
              </span>
            </button>
            <span v-if="dragTier(slot.gem.id) !== null" class="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded bg-amber-300 px-1 text-[10px] font-bold text-slate-950"> {{ ['I','II','III','IV'][(dragTier(slot.gem.id) ?? 1)-1] }} </span>
            <div v-if="opened === slot.gem.id" role="menu" :aria-label="MATERIA_KINDS[slot.gem.kind].name + ' spells'"
              class="absolute bottom-full left-0 z-[100] mb-2 w-52 space-y-1 rounded-lg border border-default bg-elevated p-2 shadow-xl">
              <p class="text-xs font-semibold">{{ MATERIA_KINDS[slot.gem.kind].name }}</p>
              <template v-if="castable(slot.gem.kind)">
                <UButton v-for="tier in materiaLevel(slot.gem)" :key="tier" size="xs" block
                  :disabled="phase !== 'playing' || materia.mp < cost(slot.gem.kind, materiaLevel(slot.gem), tier)"
                  :variant="dragTier(slot.gem.id) === tier ? 'solid' : 'outline'"
                  @click="chooseSpell(slot.gem.id, tier)">
                  Select {{ ['I','II','III','IV'][tier-1] }} · {{ cost(slot.gem.kind, materiaLevel(slot.gem), tier) }} MP
                </UButton>
                <p class="text-xs text-muted">Choose a spell, then drag this Materia onto a card.</p>
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
