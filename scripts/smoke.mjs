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

await run('Nuxt SSR renders connected home page', async () => {
  const response = await fetch(webUrl);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /PokerManic/);
  assert.match(html, /API connected/);
});

if (process.exitCode) {
  console.error('Milestone 1 is NOT complete. Fix failures before proceeding.');
} else {
  console.log('Milestone 1 smoke tests passed.');
}
