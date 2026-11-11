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
  assert.match(html, /Milestone 3/);
  assert.match(html, /Poker hand scoring/);
  assert.match(html, /Choose five cards to play/);
  assert.match(html, /Hand selection/);
  assert.match(html, /Preview unlocked perk/);
  assert.match(html, /Automatic selection active/);
  assert.match(html, /Manual/);
  assert.match(html, /Score selected hand/);
  assert.match(html, /Clear selection/);
  assert.match(html, /Milestone 4/);
  assert.match(html, /Remaining in deck/);
  assert.match(html, /Shuffle &amp; deal|Shuffle & deal/);
  assert.match(html, /Deal next hand/);
  assert.match(html, /Milestone 3/);
  // The first hand is seeded: both server and browser hydrate the same eight cards.
  assert.equal((html.match(/data-testid="playing-card"/g) ?? []).length, 8);
  assert.match(html, /data-testid="deck-count"[^>]*>44</);
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
  console.log('Milestone 3 smoke tests passed.');
}
