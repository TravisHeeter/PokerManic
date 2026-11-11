<template>
      <section aria-labelledby="progress-heading" class="space-y-3">
        <h2 id="progress-heading" class="text-xl font-semibold">Development progress</h2>
        <div class="grid gap-3 sm:grid-cols-3">
          <div class="rounded-lg border border-default p-4 space-y-2">
            <p class="text-xs uppercase tracking-wide text-muted">Milestone 1</p>
            <p class="font-semibold">Foundation</p>
            <UBadge color="success" variant="subtle">Implemented</UBadge>
          </div>
          <div class="rounded-lg border border-primary p-4 space-y-2">
            <p class="text-xs uppercase tracking-wide text-muted">Milestone 2</p>
            <p class="font-semibold">Deck and visual cards</p>
            <UBadge color="success" variant="subtle">Implemented</UBadge>
          </div>
          <div class="rounded-lg border border-default p-4 space-y-2">
            <p class="text-xs uppercase tracking-wide text-muted">Milestone 5</p>
            <p class="font-semibold">Run upgrades</p>
            <UBadge color="primary" variant="subtle">Current</UBadge>
          </div>
        </div>
        <p class="text-sm text-muted">
          Milestone 4 delivered endless rounds, thresholds and discards. Milestone 5 adds
          spendable upgrade chips, a between-round shop, and unlockable Manual Selection.
          Up next: Milestone 6 — persistent progression groundwork.
        </p>
      </section>
</template>
