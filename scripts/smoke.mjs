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
  assert.match(html, /Milestone 9/);
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
  assert.match(html, /Card styles/);
  assert.match(html, /data-card-style="classic"/);
  assert.match(html, /data-suit-colors="themed"/);
  for (const style of [
    'classic', 'victorian', 'deco', 'cyber', 'bold-victorian',
    'vivid-gothic', 'art-nouveau', 'cosmic-horror', 'medieval-illuminated',
  ]) {
    assert.match(html, new RegExp(`data-testid="card-style-${style}"`));
  }
  assert.match(html, /Dealt order/);
  assert.match(html, /data-testid="sort-rank"/);
  assert.match(html, /data-testid="sort-rank"[^>]*aria-pressed="true"|aria-pressed="true"[^>]*data-testid="sort-rank"/);
  assert.match(html, /data-testid="sort-suit"/);

  assert.match(html, /Start new run/);
  assert.match(html, /Perk shop/);
  // These sections are rendered by separate Nuxt auto-imported components.
  assert.match(html, /Development progress/);
  assert.match(html, /Prestige chips/);
  assert.match(html, /Card modifier shop/);
  assert.match(html, /data-testid="buy-card-modifier-bonus"/);
  assert.match(html, /data-testid="buy-card-modifier-multiplier"/);
  for (const id of ['gold','echo','growing','wild_suit','wild_rank','wild_full']) {
    assert.match(html, new RegExp(`data-testid="buy-card-modifier-${id}"`));
  }
  assert.match(html, /data-testid="transcend-action"/);
  assert.match(html, /9 milestones implemented/);
  for (let milestone = 1; milestone <= 9; milestone++) {
    assert.match(html, new RegExp(`data-testid="milestone-${milestone}"`));
  }
  assert.match(html, /data-testid="milestone-next"/);
  assert.match(html, /Milestone 9/);
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
  assert.match(html, /Card modifiers/);
  assert.match(html, /data-testid="modifier-shop-content"/);
  assert.match(html, /data-testid="settings-content"/);
  assert.match(html, /data-testid="suit-colors-themed"/);
  assert.match(html, /data-testid="suit-colors-standard"/);
  assert.match(html, /data-testid="suit-palette-settings"/);
  assert.match(html, /data-testid="custom-suit-spades"/);
  assert.match(html, /data-testid="custom-suit-hearts"/);
  assert.match(html, /data-testid="custom-suit-clubs"/);
  assert.match(html, /data-testid="custom-suit-diamonds"/);
  assert.match(html, /data-testid="suit-palette-e63946"/);
  assert.match(html, /data-testid="suit-palette-2ec4b6"/);
  assert.match(html, /data-testid="reset-selected-suit-color"/);
  assert.match(html, /data-testid="reset-all-suit-colors"/);
  assert.match(html, /Standard red &amp; black|Standard red & black/);
  assert.match(html, /Card styles/);
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
  console.log('Milestone 8 smoke tests passed.');
}
