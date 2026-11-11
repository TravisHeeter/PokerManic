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
