# Architecture decisions (Milestone 1)

1. **TypeScript/pnpm monorepo:** `apps/web`, `apps/api`, `packages/contracts`.
2. **Browser rendering:** Nuxt 4 + Vue 3; Nuxt UI for app shell and controls.
3. **API:** Nest 11, with REST routes. Nest 11 is chosen conservatively while other dependencies settle; we can evaluate Nest 12 after green integration tests.
4. **Schema source:** Zod 4 schemas live in `packages/contracts`; `nestjs-zod` maps them to validated Nest DTOs and Swagger. No duplicate `class-validator` DTO model.
5. **API docs vs enforcement:** Swagger publishes OpenAPI; the global Zod pipe validates requests. Serializer interceptor enforces declared responses.
6. **SSR integration:** Nuxt Nitro `/api/health` calls Nest on the server and validates its response. No browser-to-Nest CORS configuration is necessary in the initial design.
7. **Gameplay isolation:** Next milestone will create `packages/engine`, pure TypeScript, with no framework dependencies. No game logic belongs in a Vue component or Nest controller.
8. **No database or auth yet:** Starting with these prematurely increases test surface. Add persistent accounts later, based on game requirements.
9. **Milestone gate:** Only continue if `pnpm typecheck`, `pnpm test`, `pnpm build`, and `pnpm smoke` pass on a real installed environment.
10. **Diagnostic echo endpoint:** Temporary, proves global Zod validation and Swagger request-schema generation. Remove after the first real gameplay input endpoint exists.

## Milestone 2A decisions

11. **Pure card engine:** `packages/engine` owns deck operations and depends only on the shared contract package. It has no framework or API dependencies.
12. **Base-card values:** Cards have `suit` and `rank` as validated Zod-derived types. Card-instance identity will be introduced when the game needs duplicate or modified copies.
13. **Predictable state:** Deck creation, shuffling, and dealing return new arrays instead of mutating caller-owned collections.
14. **Testable randomness:** The shuffle uses Fisher–Yates and accepts an injected random function to produce reproducible unit tests.
15. **Incremental gate:** Validate engine tests and all existing integration checks before designing the Vue card UI.

16. **Visible milestone requirement:** Every milestone must advance the Nuxt homepage’s milestone label, implementation summary, and next-step text—even if no new gameplay UI exists. The SSR smoke test must assert the current label to guard against stale pages.

## Milestone 2B decisions

17. **Engine is the source of truth:** The Vue page calls the exported `createStandardDeck`, `shuffleDeck`, and `dealCards` functions from `@pokermanic/engine`; no duplicate dealing logic in the component.
18. **SSR-safe opening hand:** A seeded opening shuffle runs identically on server and client; fresh random shuffles run only after user interaction.
19. **Demo scope:** The page shows rank/suit cards and draw-pile counts. No selection, scoring, persistence, or round rules are implied.
20. **Visible acceptance:** The smoke test confirms milestone text and exactly eight rendered playing-card elements on initial SSR.
21. **Sequential milestone numbers:** Starting after historical Milestone 2A/2B, use only whole-number milestone labels: 3, 4, 5, and onward. No A/B/C subdivisions. Every milestone is independently testable, updates the homepage, and has a passing acceptance gate.

## Milestone 3 decisions

22. **Five-card recognition in pure engine:** `evaluatePokerHand` validates five distinct cards, detects the ten standard hand categories (including royal flush), and scores them without mutating cards.
23. **Ace-low straight:** A-2-3-4-5 is a straight, including its straight-flush variant, but is not a royal flush. Other ace wraparounds are not valid straights.
24. **Provisional scoring:** Each category has a fixed base-chip value and multiplier. The first scoring model is `baseChips × multiplier`. Individual rank bonuses, jokers, hand upgrades, game rounds, and persistence are outside Milestone 3.
25. **Frontend interaction:** Players may select or deselect up to five cards in the eight-card hand. A five-card selection previews a category and score; the Score button confirms the evaluation. Drawing, shuffling, or resetting clears the selection and last score.
26. **Sequential labels:** The current homepage is **Milestone 3**; the historical 2A and 2B stages are collectively shown as Milestone 2. Next is Milestone 4, with no subdivisions.

## Milestone 3 scoring design update

27. **Enumerate rather than assume strongest:** `listEligiblePokerHands` returns every qualifying poker pattern and the particular contributing cards. High Card has an option for every selected card, even if the player holds stronger cards or a straight flush. The engine recognizes up to eight committed cards, including 3/4 pair, larger straights/flushes, and extended full houses such as 4+4. Scores for these longer patterns are provisional.
28. **Perk gated choice:** `resolveScoringOption` selects the highest poker-ranked option automatically unless the Manual Hand Selection perk is unlocked *and* Manual mode is active. The choice can be a lower card, such as a boosted Jack; its actual card-specific bonus is a later system. Auto ignores a manually requested option.
29. **Player-configurable mode:** After the perk is unlocked, players can switch freely between Automatic and Manual. In Automatic, formation radios are disabled and the automatic scoring subset is highlighted. In Manual, the selected option's specific scoring subset is highlighted. Use a clearly labeled ephemeral development preview of the unlock in Milestone 3; no unearned permanent unlock or real upgrade economy exists yet.
30. **Card intent separated:** Cards committed to a play differ from cards contributing to the chosen scoring formation. Unique instance IDs, card-specific multipliers, perk persistence, consumptions/discards and player state belong to future milestones.
31. **Future roguelite direction:** Endless survival-style chip-threshold rounds (possibly progressively longer); modular upgrades for hand size, maximum cards played, maximum cards discarded (up to eight), hands and discards per round; and transcendence with run reset plus permanent privileges. Run progression and durable account progression must be separated, and scores are not automatically spendable chip balances. Do not prematurely build the economy into Milestone 3.
32. **Ranking balance is provisional:** Automatic selection uses hand rank rather than projected upgrade-adjusted score. Ordering of novel multiple-pair and expanded patterns is a temporary engine definition pending game balance, not an established permanent ranking.
