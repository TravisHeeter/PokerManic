# PokerManic — Milestone 5: Run upgrades and perk shop

Browser-based poker survival roguelite in development. Milestone 1 established the stack; Milestone 2 added the deck and visual cards. Milestone 3 added player-directed scoring foundations. Milestone 4 makes the game playable with escalating round thresholds, limited scoring hands, discards, and round progression.

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

## Milestone 4: Endless survival rounds

Milestone 4 turns the Milestone 3 scoring demo into the first **playable run loop**.

- **Round 1:** 60-chip target, four scoring hands and three discard actions.
- **Playing cards:** Select exactly five and press **Score selected hand**. All five cards leave your hand, but only the chosen eligible scoring subset contributes chips. The game refills your hand from the draw pile and subtracts one scoring hand. The confirmed scoring option remains automatic unless the Manual Hand Selection perk preview is activated.
- **Discarding:** Select one to five cards and press **Discard selected**. They are replaced and one discard action is consumed. Discarding earns no chips.
- **Progression:** Once round chips meet the target, the game pauses in a success state; press **Next round** to shuffle a fresh 52-card deck and face a higher target. Run total chips carry forward; round chips, hands, and discards reset.
- **Defeat:** Using the final scoring hand without reaching the chip target ends the run. **Start new run** returns to Round 1 and resets the total.
- **Card recycling:** If a round's draw pile empties, played and discarded cards are reshuffled back into the draw pile as needed, so a run is not lost merely because the deck was exhausted. Hand selection and card identity are preserved within each new draw.
- **No maximum round:** The target and action-limit functions accept positive round numbers, with no fixed end-of-game round. At high rounds additional scoring hands and discards increase round length; the exact pacing is provisional and bounded by safe integer arithmetic.

Round configuration resides entirely in `packages/engine/src/rounds.ts` as `DEFAULT_ROUND_RULES`:

| Rule | Milestone 4 default |
|---|---:|
| Hand size | 8 |
| Cards committed per scoring hand | 5 |
| Maximum cards discarded per action | 5 |
| Starting scoring hands | 4 |
| Starting discards | 3 |
| Extra scoring hand | Every 4 completed rounds |
| Extra discard | Every 6 completed rounds |
| Chip target (round `n`) | `60 + 40(n - 1) + 15(n - 1)²` |

These are **temporary balance parameters**. Future perks can increase these values without changing the core scoring algorithm. Score chips are **not a spendable currency** yet; store and progression mechanics remain out of scope. The developer-only manual hand-selection preview is retained, not treated as an earned upgrade.

### Local acceptance tests

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build
pnpm dev
```

In a second terminal with both servers running:

```bash
pnpm smoke
```

At http://localhost:3000 check the initial 60-chip target, 4 hands, 3 discards, 8 held cards and 44 in the draw pile. Score a hand and see chips and hands remaining change. Discard 1–5 cards and verify that only the discard count decreases. Try the temporary Manual perk preview, including High Card choices. Reach a target and advance to Round 2. Lose a run by exhausting scoring hands below the target and restart it. Confirm the red M favicon still appears.

**Up next: Milestone 5** — configurable progression and player-upgrade foundations. Permanent perks, transcendence, purchasing currencies and persistence will be added in subsequent milestones, not implied by the current demonstration.

## Milestone 5: Spendable upgrade chips and run-only perks

The first functional perk economy is part of **Milestone 5**, with a separate in-run currency and an always-open shop during active runs. It is intentionally distinct from the scoring system, and this is **not** permanent/transcendent progression.

**Game flow:** Beat a round's scoring-chip target. The game awards **upgrade chips** equal to `floor(roundChips / 10)` (minimum 1). Those chips accumulate in a separate wallet; the round's scoring chips are not deducted. The shop stays available throughout an active run. Buy any affordable perk while playing or after winning a round, or save your chips for later. **Rule upgrades affect the next round**, without changing your current hand or remaining actions; **Manual Hand Selection unlocks immediately** so players can switch to Manual during the same round. The same shop cannot pay its reward twice.

The provisional run perks:

| Perk | Initial cost | Maximum upgrades | Effect |
|---|---:|---:|---|
| Extra scoring hand | 5 | 4 | +1 scoring attempt per round |
| Extra discard action | 4 | 4 | +1 discard per round |
| Hand size | 8 | 4 | +1 held card (8 → 12) |
| Cards per play | 12 | 3 | +1 card committed for scoring (5 → 8) |
| Cards per discard | 7 | 3 | +1 card discarded per action (5 → 8) |
| Manual Hand Selection | 10 | 1 | Enables Manual mode and choosing specific contributing scoring cards |

Each upgrade's price increases with its current level (`baseCost × (level + 1)`). The caps reflect the current pure engine limit of **eight cards per scoring play**, rather than a permanent design restriction. The existing radio-button interface is now **genuinely unlocked by purchasing** the perk, not a developer-only preview. Automatic remains available and is the default for every new run. When Manual is unlocked, it can score an individually chosen High Card even when higher cards exist.

Purchases are permitted during active play and between rounds. Buttons are disabled only for insufficient currency, a maximum-level perk, or after a run ends. The shop remains visible after defeat, but run-only purchases are unavailable because there is no remaining run to benefit from them. A new run resets the run-only wallet, perk levels, and scoring history. A later milestone will introduce separately persisted/meta-currency and transcendence; **no permanent privileges exist yet**.

The upgrade rules are defined and tested in `packages/engine/src/progression.ts`, independent of Vue/Nuxt. The Nuxt page visibly identifies Milestone 5 and displays the wallet and shop.

### Run upgrade acceptance tests

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build
pnpm dev
```

In a separate terminal run `pnpm smoke`. At `http://localhost:3000`, confirm that the shop is visible from Round 1 with the wallet at 0, with buy buttons disabled only because you cannot yet afford a perk. Win a round; verify the wallet receives a reward. Advance without purchasing, then buy a perk **during Round 2**. Verify the wallet decreases but existing round limits remain unchanged. Advance again to verify the upgraded limit is reflected in gameplay. Purchase Manual Hand Selection mid-round whenever affordable: Manual mode should enable immediately, and selecting a lower High Card should work without advancing another round. Switch back to Automatic. Starting a new run should clear purchases and reset the wallet.
