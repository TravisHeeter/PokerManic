<script setup lang="ts">
import { computed } from 'vue';
const props = defineProps<{
  status: string;
  json: string;
  blocked: boolean;
}>();
const emit = defineEmits<{
  'update:json': [value: string];
  export: [];
  import: [];
  'new-run': [];
}>();
const draftChips = computed(() => {
  try {
    const save = JSON.parse(props.json) as { progress?: { upgradeChips?: unknown } };
    return typeof save.progress?.upgradeChips === 'number' ? String(save.progress.upgradeChips) : '';
  } catch { return ''; }
});
function changeChips(event: Event) {
  const value = (event.target as HTMLInputElement).value;
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value))) return;
  try {
    const save = JSON.parse(props.json) as { progress?: Record<string, unknown> };
    if (!save.progress) return;
    save.progress.upgradeChips = Number(value);
    emit('update:json', JSON.stringify(save, null, 2));
  } catch { /* Import validation will explain malformed JSON. */ }
}
function change(event: Event) {
  emit('update:json', (event.target as HTMLTextAreaElement).value);
}
</script>

<template>
  <section aria-labelledby="save-heading" class="space-y-3">
    <UCard>
      <div class="space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h2 id="save-heading" class="text-2xl font-bold">God Mode</h2>
          <UBadge color="neutral" variant="subtle">Browser only · JSON v1</UBadge>
        </div>
        <p data-testid="save-status" aria-live="polite" class="text-sm">{{ status }}</p>
        <p class="text-xs text-muted">
          Autosaves stay in this browser. They are not uploaded. Export a backup,
          edit its JSON freely, then import it to change your game.
          Corrupted or unsupported saves are not automatically overwritten.
        </p>
        <details class="rounded-lg border border-default p-3">
          <summary class="cursor-pointer font-semibold">Show save tools and JSON editor</summary>
          <div class="mt-3 space-y-3">
            <div class="flex flex-wrap gap-2">
              <UButton data-testid="export-save" color="neutral" variant="outline"
                @click="emit('export')">Export JSON</UButton>
              <UButton data-testid="import-save" color="primary" :disabled="!json.trim()"
                @click="emit('import')">Import edited JSON</UButton>
              <UButton data-testid="reset-save" color="error" variant="outline"
                @click="emit('new-run')">Start new run & reset save</UButton>
            </div>
            <div class="flex flex-wrap items-center gap-3 rounded-lg border border-default p-3">
              <label for="draft-upgrade-chips" class="text-sm font-semibold">
                Upgrade chips <code class="text-xs text-muted">progress.upgradeChips</code>
              </label>
              <input id="draft-upgrade-chips" data-testid="draft-upgrade-chips"
                type="number" min="0" step="1" :value="draftChips" @input="changeChips"
                class="w-36 rounded-md border border-default bg-default px-3 py-2 font-mono text-sm" />
              <span class="text-xs text-muted">Edits the JSON draft; click Import edited JSON to apply.</span>
            </div>
            <label for="save-json" class="block text-sm font-semibold">Editable save JSON</label>
            <textarea id="save-json" data-testid="save-json" rows="12"
              spellcheck="false" :value="json" @input="change"
              class="w-full resize-y rounded-lg border border-default bg-default p-3 font-mono text-xs"
              placeholder="Your current browser save loads here automatically. You can edit it or paste another save." />
            <p v-if="blocked" class="text-xs text-amber-300">
              Saving is paused to protect your existing invalid save. Import valid JSON or start a new run.
            </p>
          </div>
        </details>
      </div>
    </UCard>
  </section>
</template>
