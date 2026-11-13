<script setup lang="ts">
const completedMilestones = [
  { number: 1, title: 'Foundation', description: 'Nuxt, NestJS, shared contracts, and API tooling.' },
  { number: 2, title: 'Deck and visual cards', description: 'Card display, suits, and the deck model.' },
  { number: 3, title: 'Poker hand evaluation', description: 'Hand selection, eligible formations, and scoring.' },
  { number: 4, title: 'Endless rounds', description: 'Increasing chip targets, hands, and discards.' },
  { number: 5, title: 'Run upgrades', description: 'Always-open perk shop and combined hand scoring.' },
  { number: 6, title: 'Browser saves and modding', description: 'Automatic local saves, editable JSON, and import/export.' },
  { number: 7, title: 'Transcendence', description: 'Prestige rewards, reset, and permanent perks.' },
  { number: 8, title: 'Card modifiers', description: 'Bonus and multiplier cards with a run-long modifier shop.' },
  { number: 9, title: 'Expanded card effects', description: 'Suit, rank and full wilds; Gold, Echo and Growing modifiers.' },
] as const;
const nextMilestone = {
  number: 10,
  title: 'Card rarities',
  description: 'Rarities and additional visual treatments.',
};
</script>

<template>
  <section aria-labelledby="progress-heading" class="space-y-3">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h2 id="progress-heading" class="text-xl font-semibold">Development progress</h2>
      <UBadge color="success" variant="subtle" data-testid="milestone-summary">
        {{ completedMilestones.length }} milestones implemented
      </UBadge>
    </div>
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div v-for="milestone in completedMilestones" :key="milestone.number"
        :data-testid="`milestone-${milestone.number}`"
        class="rounded-lg border border-default p-4 space-y-2">
        <p class="text-xs uppercase tracking-wide text-muted">Milestone {{ milestone.number }}</p>
        <p class="font-semibold">{{ milestone.title }}</p>
        <p class="text-xs text-muted">{{ milestone.description }}</p>
        <UBadge color="success" variant="subtle">Implemented</UBadge>
      </div>
      <div data-testid="milestone-next" class="rounded-lg border border-primary p-4 space-y-2">
        <p class="text-xs uppercase tracking-wide text-muted">Milestone {{ nextMilestone.number }}</p>
        <p class="font-semibold">{{ nextMilestone.title }}</p>
        <p class="text-xs text-muted">{{ nextMilestone.description }}</p>
        <UBadge color="neutral" variant="subtle">Up next</UBadge>
      </div>
    </div>
    <p class="text-sm text-muted">
      Milestones 1–9 are implemented. Milestone 10 — Card Rarities — is planned next.
      The highlighted border marks the upcoming milestone, not an incomplete older one.
    </p>
  </section>
</template>
