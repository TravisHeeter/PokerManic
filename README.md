# PokerManic — Milestone 2A: Card engine

Browser-based poker-inspired roguelike. Milestone 1 established the full stack; Milestone 2A adds a tested, framework-independent deck engine. Card rendering and gameplay are next.

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

## Milestone 2A: Card engine (no UI yet)

A framework-independent TypeScript package lives at `packages/engine`. It uses
Zod-derived `Card` types from `packages/contracts` but does not depend on
Vue, Nuxt, NestJS, browser globals, or a database.

- `createStandardDeck()` returns a fresh ordered deck containing 52 unique rank/suit pairs.
- `shuffleDeck(deck, random?)` performs a non-mutating Fisher–Yates shuffle.
  An injectable random source makes shuffling deterministic in tests.
- `dealCards(deck, count)` returns a hand and remaining deck without mutation.
  Invalid counts throw `RangeError`.

From the repository root, after `pnpm install`, run:

```bash
pnpm --filter @pokermanic/contracts build
pnpm --filter @pokermanic/engine test
pnpm typecheck
pnpm test
pnpm build
```

The home page now displays the **Milestone 2A — Card engine** summary, the implemented features,
current API status, and the next milestone. It intentionally does not render a playable hand.
The smoke test asserts these milestone labels are present in the server-rendered HTML.
We will render cards only after these engine and regression checks pass. Card instance IDs, scoring, and modifiers are
future steps and are not part of this initial standard-deck model.

## Milestone page requirement (every milestone)

Each milestone, including backend-only or engine-only work, **must update** the
summary on `apps/web/app/pages/index.vue`. Include the current milestone label,
features completed, honest UI limitations, and next step. Update the SSR assertions
in `scripts/smoke.mjs` to cover the newly displayed milestone and include them
in the existing CI gate before merging. This is a required acceptance criterion,
not an optional UI enhancement.

## Milestone 2B: Visual card hand

The home page now renders an eight-card hand using `@pokermanic/engine` in Vue.
Its initial deal is deterministic during server rendering so browser hydration matches;
random shuffling happens only when the user clicks.

- **Shuffle & deal:** shuffle a fresh 52-card deck and draw eight cards.
- **Deal next hand:** replace the displayed hand with the next eight cards;
  the remaining-deck counter decreases by eight and never duplicates cards.
- **Reset deck:** restore the ordered 52-card deck and deal the first eight.
- **Card counter:** show eight cards in the hand, cards remaining in the draw pile,
  and number of hands dealt since the most recent reset.

No card selection, scoring, or persistence is implemented yet; those are later milestones.

To try the page on the `fix/milestone-2b-on-main` branch (the merge correction):

```bash
nvm use
pnpm install
pnpm dev
```

Visit http://localhost:3000. Try Shuffle & deal, Deal next hand (until fewer than
8 cards remain), and Reset deck. Run `pnpm smoke` with both servers running;
the smoke test verifies server-rendered cards and the Milestone 2B label.

## Milestone naming convention

Milestone 2A and 2B were historical development slices. **Future milestones use only consecutive whole numbers:** Milestone 3, Milestone 4, Milestone 5, etc.—no lettered subdivisions. Each milestone must include a visible homepage update and pass the automated acceptance checks before merging.
