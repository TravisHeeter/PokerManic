// Offline structural checks only. These are NOT a substitute for npm installation,
// TypeScript compilation, running the servers, or the smoke tests.
import { readFileSync, existsSync } from 'node:fs';
import assert from 'node:assert/strict';
import { join } from 'node:path';

const root = new URL('../', import.meta.url).pathname;
const file = (path) => readFileSync(join(root, path), 'utf8');
for (const path of [
  '.nvmrc', 'pnpm-workspace.yaml',
  'packages/contracts/src/index.ts',
  'apps/api/src/main.ts',
  'apps/api/src/app.module.ts',
  'apps/api/src/health/health.controller.ts',
  'apps/web/nuxt.config.ts',
  'apps/web/server/api/health.get.ts',
  'apps/web/app/pages/index.vue',
  'scripts/smoke.mjs',
]) assert.ok(existsSync(join(root, path)), `Missing ${path}`);
for (const pkg of ['package.json', 'apps/api/package.json', 'apps/web/package.json', 'packages/contracts/package.json']) {
  JSON.parse(file(pkg));
}
assert.match(file('apps/api/src/app.module.ts'), /APP_PIPE/);
assert.match(file('apps/api/src/main.ts'), /cleanupOpenApiDoc/);
assert.match(file('apps/web/server/api/health.get.ts'), /healthResponseSchema\.parse/);
assert.match(file('scripts/smoke.mjs'), /status, 400/);
console.log('Offline scaffold structure passed; runtime validation still required.');
