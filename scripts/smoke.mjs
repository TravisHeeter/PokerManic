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
  assert.match(html, /Milestone 6/);
  assert.match(html, /Browser saves/);
  assert.match(html, /Round 1/);
  assert.match(html, /Chip target/);
  assert.match(html, /Hands remaining/);
  assert.match(html, /Discards remaining/);
  assert.match(html, /Run scoring chips/);
  assert.match(html, /No fixed final round|no fixed final round/);
  assert.match(html, /Hand selection/);
  assert.match(html, /Manual Selection locked/);
  assert.match(html, /Automatic selection active/);
  const playButton = html.match(/<button[^>]*data-testid="score-hand"[^>]*>[\s\S]*?<\/button>/)?.[0];
  const discardButton = html.match(/<button[^>]*data-testid="discard-selected"[^>]*>[\s\S]*?<\/button>/)?.[0];
  assert.ok(playButton, 'Play button should render');
  assert.ok(discardButton, 'Discard button should render');
  assert.match(playButton, /aria-label="Play selected cards"/);
  assert.match(discardButton, /aria-label="Discard selected cards"/);
  assert.equal((html.match(/data-testid="score-hand"/g) ?? []).length, 1);
  assert.equal((html.match(/data-testid="discard-selected"/g) ?? []).length, 1);
  assert.ok(html.indexOf('data-testid="score-hand"') < html.indexOf('Hand selection'));
  assert.match(html, /1–5 to score|1.{0,25}5 to score/);
  assert.match(html, /Sort cards:/);
  assert.match(html, /Dealt order/);
  assert.match(html, />Rank</);
  assert.match(html, /data-testid="sort-rank"[^>]*aria-pressed="true"|aria-pressed="true"[^>]*data-testid="sort-rank"/);
  assert.match(html, />Suit</);

  assert.match(html, /Start new run/);
  assert.match(html, /id="shop-heading"[^>]*>Perk shop<\/h2>/);
  // These sections are rendered by separate Nuxt auto-imported components.
  assert.match(html, /Poker hand evaluation/);
  assert.match(html, /Development progress/);
  assert.match(html, /6 milestones implemented/);
  for (let milestone = 1; milestone <= 6; milestone++) {
    assert.match(html, new RegExp(`data-testid="milestone-${milestone}"`));
  }
  assert.match(html, /data-testid="milestone-next"/);
  assert.match(html, /Milestone 7/);
  assert.match(html, /Transcendence/);
  assert.doesNotMatch(html, /Milestone 2[^]*?Current/);
  assert.match(html, /Local saves &amp; modding|Local saves & modding/);
  assert.match(html, /Show save tools and JSON editor/);
  assert.match(html, /data-testid="draft-upgrade-chips"/);
  assert.match(html, /progress\.upgradeChips/);
  assert.match(html, /Import edited JSON/);
  assert.match(html, /System status/);
  assert.match(html, /Shop open throughout your run/);
  assert.doesNotMatch(html, /Shop closed/);
  assert.match(html, /data-testid="perk-shop-dock"/);
  assert.match(html, /data-testid="perk-shop-toggle"/);
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /aria-controls="perk-shop-content"/);
  assert.match(html, /data-testid="perk-shop-content"/);
  assert.match(html, /Show upgrades/);
  assert.match(html, /Upgrade chips/);
  assert.match(html, /Manual hand selection/);
  assert.match(html, /Milestone 6/);
  assert.match(html, /Remaining in deck/);
  // The first hand is random per server render and serialized for identical browser hydration.
  assert.equal((html.match(/data-testid="playing-card"/g) ?? []).length, 8);
  assert.match(html, /data-testid="deck-count"[^>]*>44</);
  assert.match(html, /data-testid="chip-target"[^>]*>60</);
  assert.match(html, /data-testid="hands-remaining"[^>]*>4</);
  assert.match(html, /data-testid="discards-remaining"[^>]*>3</);
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
  console.log('Milestone 6 smoke tests passed.');
}
