import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const apiUrl = process.env.SMOKE_API_URL || 'http://localhost:4000';
const webUrl = process.env.SMOKE_WEB_URL || 'http://localhost:3000';

async function run(name, check) {
  try {
    await check();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}:`, error.message);
    process.exitCode = 1;
  }
}

await run('NestJS GET /api/health', async () => {
  const response = await fetch(`${apiUrl}/api/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    status: 'ok', service: 'pokermanic-api', version: '0.1.0',
  });
});

await run('Zod accepts and trims valid POST body', async () => {
  const response = await fetch(`${apiUrl}/api/health/echo`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ message: '  hello  ' }),
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { echo: 'hello' });
});

await run('Zod rejects invalid POST body (400)', async () => {
  const response = await fetch(`${apiUrl}/api/health/echo`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ message: '' }),
  });
  assert.equal(response.status, 400);
});

await run('Swagger JSON documents both endpoints', async () => {
  const response = await fetch(`${apiUrl}/docs-json`);
  assert.equal(response.status, 200);
  const document = await response.json();
  assert.ok(document.paths['/api/health']?.get);
  assert.ok(document.paths['/api/health/echo']?.post);
  assert.ok(document.paths['/api/health/echo'].post.requestBody);
});

await run('Nuxt SSR renders current milestone and connected home page', async () => {
  const response = await fetch(webUrl);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /PokerManic/);
  assert.match(html, /favicon\.svg\?v=1/);
  assert.match(html, /API connected/);
  assert.match(html, /Milestone 10/);
  assert.match(html, /Transcendence/);
  assert.match(html, /data-testid="round-number"[^>]*>\s*Round 1 - 60 Chips\s*</);
  assert.match(html, /Chip count/);
  assert.match(html, /Hand selection/);
  assert.doesNotMatch(html, /data-testid="manual-perk-status"/);
  const playButton = html.match(/<button[^>]*data-testid="score-hand"[^>]*>[\s\S]*?<\/button>/)?.[0];
  const discardButton = html.match(/<button[^>]*data-testid="discard-selected"[^>]*>[\s\S]*?<\/button>/)?.[0];
  assert.ok(playButton, 'Play button should render');
  assert.ok(discardButton, 'Discard button should render');
  assert.match(playButton, /aria-label="Play selected cards"/);
  assert.match(discardButton, /aria-label="Discard selected cards"/);
  // Remaining action counts are now shown inside the play/discard buttons.
  assert.match(playButton, /\(x\s*4\)/);
  assert.match(discardButton, /\(x\s*3\)/);
  assert.equal((html.match(/data-testid="score-hand"/g) ?? []).length, 1);
  assert.equal((html.match(/data-testid="discard-selected"/g) ?? []).length, 1);
  assert.match(html, /data-testid="hand-actions"/);
  assert.equal((html.match(/data-testid="hand-actions"/g) ?? []).length, 1);
  assert.equal((html.match(/data-testid="clear-selection"/g) ?? []).length, 1);
  assert.match(html, /aria-label="Sort cards"/);
  assert.match(html, /data-card-style="classic"/);
  assert.match(html, /data-suit-colors="themed"/);
  assert.match(html, /Dealt order/);
  assert.match(html, /data-testid="sort-rank"/);
  assert.match(html, /data-testid="sort-rank"[^>]*aria-pressed="true"|aria-pressed="true"[^>]*data-testid="sort-rank"/);
  assert.match(html, /data-testid="sort-suit"/);

  assert.match(html, /Start new run/);
  assert.match(html, /Perk shop/);
  // These sections are rendered by separate Nuxt auto-imported components.
  assert.match(html, /Development progress/);
  assert.match(html, /Prestige chips/);
  assert.match(html, /data-testid="materia-board"/);
  assert.match(html, /Materia Board/);
  assert.match(html, /Spells/);
  assert.match(html, /Materia Inventory/);
  assert.doesNotMatch(html, /Card modifier shop/);
  assert.match(html, /data-testid="transcend-action"/);
  assert.match(html, /9 milestones implemented/);
  for (let milestone = 1; milestone <= 9; milestone++) {
    assert.match(html, new RegExp(`data-testid="milestone-${milestone}"`));
  }
  assert.match(html, /data-testid="milestone-next"/);
  assert.match(html, /Milestone 10/);
  assert.match(html, /Transcendence/);
  // The milestone badges are verified individually above; do not scan across unrelated panels.
  assert.match(html, /God Mode/);
  assert.doesNotMatch(html, /Show save tools and JSON editor/);
  assert.match(html, /data-testid="draft-upgrade-chips"/);
  assert.match(html, /progress\.upgradeChips/);
  assert.match(html, /Import edited JSON/);
  assert.match(html, /System status/);
  assert.match(html, /Shop open throughout your run/);
  assert.doesNotMatch(html, /Shop closed/);
  assert.match(html, /data-testid="perk-shop-dock"/);
  assert.match(html, /Materia/);
  assert.match(html, /Spells/);
  assert.match(html, /data-testid="transcendence-shop-content"/);
  assert.match(html, /data-testid="god-mode-content"/);
  assert.doesNotMatch(html, /h-\\[25dvh\\]/);
  assert.doesNotMatch(html, /data-testid="close-dock"/);
  assert.doesNotMatch(html, /data-testid="hand-shop-content"/);
  assert.match(html, /role="tablist"/);
  assert.doesNotMatch(html, /Show upgrades|▲ Show|▼ Hide/);
  assert.match(html, /data-testid="perk-shop-content"/);
  assert.match(html, /Upgrade chips/);
  assert.match(html, /Manual hand selection/);
  assert.match(html, /Milestone 8/);
  assert.match(html, /Remaining in deck/);
  // The first hand is random per server render and serialized for identical browser hydration.
  assert.equal((html.match(/data-testid="playing-card"/g) ?? []).length, 8);
  assert.equal((html.match(/data-selected="false"/g) ?? []).length, 8);
  assert.doesNotMatch(html, /data-testid="selected-card-check"/);
  assert.doesNotMatch(html, /data-testid="card-center-rank"/);
  assert.equal((html.match(/data-testid="card-center-suit"/g) ?? []).length, 8);
  assert.match(html, /data-testid="deck-count"[^>]*>44</);
  assert.match(html, /data-testid="round-score"[^>]*>0 \/ 60</);
  assert.match(html, /data-testid="upgrade-chip-balance"[^>]*>0</);
});

await run('Settings opens in a mobile-friendly Nuxt UI modal and retains customization controls', async () => {
  const dock = await readFile(new URL('../apps/web/app/components/PerkShop.vue', import.meta.url), 'utf8');
  const settings = await readFile(new URL('../apps/web/app/components/CardStyleSettings.vue', import.meta.url), 'utf8');
  assert.match(dock, /<UModal[^>]*v-model:open="settingsOpen"/);
  assert.match(dock, /value === 'settings'/);
  assert.match(dock, /settingsOpen\.value = true/);
  assert.match(dock, /<slot name="settings"/);
  assert.doesNotMatch(dock, /id="settings-content"/);
  assert.match(dock, /max-h-\[90dvh\]/);
  assert.match(dock, /overflow-y-auto/);
  for (const id of ['classic', 'victorian', 'deco', 'cyber', 'bold-victorian',
    'vivid-gothic', 'art-nouveau', 'cosmic-horror', 'medieval-illuminated']) {
    assert.ok(settings.includes(`id: '${id}'`));
  }
  for (const control of ['suit-colors-themed', 'suit-colors-standard', 'suit-palette-settings',
    'suit-palette-original', 'suit-palette-row-', 'role="radiogroup"']) {
    assert.ok(settings.includes(control));
  }
  const palettes = await readFile(new URL('../apps/web/app/utils/suitPalettes.ts', import.meta.url), 'utf8');
  for (const id of ['vibrant', 'electric', 'jewel', 'earth', 'playful', 'pastel', 'accessible', 'modern']) {
    assert.ok(palettes.includes(`id: '${id}'`));
  }
  // Preview reuses game-card presentation and responds to both style and palette props.
  assert.match(settings, /data-testid="card-style-sampler"/);
  assert.match(settings, /data-card-style="props.cardStyle"/);
  assert.match(settings, /data-suit-colors="props.suitColors"/);
  assert.match(settings, /suitPaletteColors\(props.selectedPalette\)/);
  assert.match(settings, /previewSuitColors\[suit.id\]/);
  assert.match(settings, /data-testid="`preview-ace-\$\{suit.id\}`"/);
  assert.match(settings, /class="pm-card relative/);
  assert.match(settings, /grid-cols-4/);
  assert.match(settings, /pm-card-center-suit/);
  assert.match(settings, /type="radio" name="suit-palette"/);
  assert.doesNotMatch(settings, /custom-suit-|reset-selected-suit-color|chooseColor/);
  const page = await readFile(new URL('../apps/web/app/pages/index.vue', import.meta.url), 'utf8');
  assert.match(page, /v-model:selected-palette="selectedPalette"/);
  assert.match(page, /suitPaletteColors\(selectedPalette\.value\)/);
});

await run('Custom PokerManic favicon is served', async () => {
  const response = await fetch(`${webUrl}/favicon.svg`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') ?? '', /image\/svg\+xml/);
  const svg = await response.text();
  assert.match(svg, /<circle[^>]*fill="#fff"/);
  assert.match(svg, /<path[^>]*fill="#d00000"/);
});

if (process.exitCode) {
  console.error('The current milestone is NOT verified. Fix failures before proceeding.');
} else {
  console.log('Milestone 10 smoke tests passed.');
}
