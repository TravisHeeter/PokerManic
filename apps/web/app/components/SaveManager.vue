<script setup lang="ts">
defineProps<{
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
function change(event: Event) {
  emit('update:json', (event.target as HTMLTextAreaElement).value);
}
</script>

<template>
  <section aria-labelledby="save-heading" class="space-y-3">
    <UCard>
      <div class="space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h2 id="save-heading" class="text-2xl font-bold">Local saves & modding</h2>
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
            <label for="save-json" class="block text-sm font-semibold">Editable save JSON</label>
            <textarea id="save-json" data-testid="save-json" rows="12"
              spellcheck="false" :value="json" @input="change"
              class="w-full resize-y rounded-lg border border-default bg-default p-3 font-mono text-xs"
              placeholder="Click Export JSON, or paste a save file here to import." />
            <p v-if="blocked" class="text-xs text-amber-300">
              Saving is paused to protect your existing invalid save. Import valid JSON or start a new run.
            </p>
          </div>
        </details>
      </div>
    </UCard>
  </section>
</template>
