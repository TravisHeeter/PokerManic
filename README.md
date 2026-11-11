# PokerManic — Milestone 3: Poker hand evaluation and scoring

Browser-based poker survival roguelite in development. Milestone 1 established the stack; Milestone 2 added the deck and visual cards. Milestone 3 adds five-card poker hand recognition and provisional scoring.

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
- Pure game rules and provisional scoring live in the framework-independent `packages/engine` package.

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

## Milestone 3: Hand evaluation and scoring

Select exactly five of the eight visible cards on http://localhost:3000. Selected cards are raised and highlighted. The evaluation panel previews one of ten categories: high card, pair, two pair, three of a kind, straight, flush, full house, four of a kind, straight flush, or royal flush. Clicking **Score selected hand** confirms the category and score. Use **Clear selection** to try a different five-card combination; Shuffle & deal, Deal next hand, and Reset deck also clear the prior selection and score.

`packages/engine/src/scoring.ts` is a deterministic, framework-independent evaluator. It requires exactly five unique standard cards, handles ace-low straights and category precedence, and returns `category`, `label`, `baseChips`, `multiplier`, and `score`.

**Provisional scoring:** `score = baseChips × multiplier` using the `POKER_HAND_VALUES` table in the engine; bonuses based on the individual card ranks, jokers, progression, deck modifiers, and scored rounds are intentionally not implemented yet.

Check from the repository root:

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build
```

Run `pnpm dev` and in a second terminal `pnpm smoke`. Test selecting five cards, scoring them, clearing selection, changing hands, and resetting. **Milestone 4** will introduce game rounds after Milestone 3 passes its local and CI gates.

## Favicon

The PokerManic tab icon is the approved red, hand-painted **M** on a white circle, inspired by the expressionist lettering associated with Fritz Lang's 1931 film `M`. The optimized SVG is at `apps/web/public/favicon.svg`, and Nuxt exposes it via the `app.head.link` configuration. The icon renders at any resolution, with transparent corners outside the circular white background.

The SSR smoke test verifies that the icon is referenced from the page and that its asset is served successfully. If the browser still displays a previous favicon, hard-refresh or clear the site's cached favicon.

## Milestone 3 design expansion: player-controlled scoring (prototype only)

**Automatic is the default.** It scores the highest poker-ranking formation; future card and hand upgrades do not change automatic hand category selection. **Manual Hand Selection is an unlockable perk**, not free at game start. Once earned, players can switch between Automatic and Manual. Returning to Automatic disables all formation radio buttons. The preferred mode can later be saved between rounds.

The engine enumerates **all eligible scoring subsets**, not just the highest ranking. Each option includes the exact contributing-card positions. High Card is always available **for each played card**, including a Jack when higher cards are present. A player may also choose between multiple distinct same-category options, such as four aces versus four kings. The eight-card prototype recognizes three/four pair, extended straights, flushes and straight flushes, and expanded full houses (3+3, 4+2, 4+3, 4+4), without deciding final scores for extended patterns. A selected scoring subset is distinct from the full set of cards committed to a play; deciding which cards are consumed happens when rounds are implemented.

**Testing in Milestone 3:** The homepage remains a five-card scoring demonstration. It starts in **Automatic** with Manual disabled; its **Preview unlocked perk** button is a temporary, clearly labeled development switch, not an earned unlock, purchase, or persistent account setting. In Manual, radio choices show all qualifying formations; the chosen set of scoring cards is highlighted. Automatic disables radio inputs again. No rank-specific bonuses are live yet.

**Planned roguelite systems, not implemented yet:** Endless escalating chip-target rounds with possible longer rounds; purchasable and persistent upgrades; configurable hand size, cards playable per hand, cards discarded at once (eventually up to eight), hands per round, and discards per round; transcendence resets a run but retains separately modeled permanent advantages. Build game state with separate run and permanent progression, and distinguish score from spendable chip currency. Cards will gain unique instance IDs when per-card modifiers arrive. Perk purchases, score multipliers attached to individual cards, progression and persistence remain future milestones. No milestone letter subdivisions.
