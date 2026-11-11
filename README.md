# PokerManic — Milestone 1: Foundation

Browser-based poker-inspired roguelike. This starter deliberately has **no gameplay yet**: the goal is to verify the stack works end to end before implementing the deck engine.

## Prerequisites

- Node.js **24.18.0** (see `.nvmrc`; Node >=24.15 required)
- pnpm **12.16.1**
- Network access to npm registry for first installation

Linux / macOS / WSL (nvm installed):

```bash
nvm install
nvm use
npm install -g pnpm@12.16.1
```

From project root:

```bash
pnpm install
pnpm dev
```

Open:

- **Frontend:** http://localhost:3000
- **Nest API:** http://localhost:4000/api/health
- **Swagger UI:** http://localhost:4000/docs
- **Swagger JSON:** http://localhost:4000/docs-json

`pnpm dev` first builds the shared Zod package, then starts Nuxt and Nest concurrently. Run it from the repository root.

## Milestone 1 acceptance gate

Run in **a second terminal** while dev servers are running:

```bash
pnpm typecheck
pnpm test
pnpm build
pnpm smoke
```

Expected outcomes:

1. Nuxt home page displays **API connected**.
2. `GET /api/health` returns status `ok` and the declared service/version.
3. Valid `POST /api/health/echo` with `{ "message": "  hello  " }` returns `{ "echo": "hello" }`.
4. Invalid echo body with empty message produces HTTP **400** (global Zod pipe).
5. Swagger JSON documents both endpoints with an echo request schema.
6. Typecheck, Vitest tests, and production builds finish without errors.

You can verify manually:

```bash
curl -i http://localhost:4000/api/health
curl -i -X POST http://localhost:4000/api/health/echo \
  -H 'Content-Type: application/json' -d '{"message":"  hello  "}'
curl -i -X POST http://localhost:4000/api/health/echo \
  -H 'Content-Type: application/json' -d '{"message":""}'
```

**Do not proceed to Milestone 2 until these checks pass.** The provided zip is source-only, with no `node_modules` or lockfile. Generate and commit `pnpm-lock.yaml` when `pnpm install` succeeds.

## Repository structure

```text
apps/
  api/                  # NestJS REST API, global Zod pipe, Swagger
  web/                  # Nuxt 4 / Vue 3 / Nuxt UI application
packages/
  contracts/            # Single source of truth: Zod schemas + inferred types
scripts/
  smoke.mjs             # Runtime API + Swagger + Nuxt SSR checks
  verify-scaffold.mjs   # Offline structural check only
docs/
  architecture-decisions.md
```

## Development notes

- `NEST_API_BASE_URL` changes the **Nuxt server-side** API base URL; default `http://localhost:4000`.
- `PORT` changes the NestJS port; if you change it, also adjust `NEST_API_BASE_URL`.
- The echo route is a temporary validation demonstration, not a gameplay feature.
- Game rules/scoring will live in a future framework-independent `packages/engine` package.

## Verification disclosure

The scaffold was generated in an environment without access to the npm registry. Only its offline structure could be checked here; its dependency resolution, builds, and runtime smoke tests **must be verified locally** before the milestone is considered complete.
