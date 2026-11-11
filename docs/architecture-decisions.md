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
