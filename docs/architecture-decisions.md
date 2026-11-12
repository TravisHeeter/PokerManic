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

## Milestone 4 decisions

33. **Survival-style rounds:** Runs advance through numbered chip thresholds until a failed round. There is no fixed last round. The target formula, hand-size limit, cards-per-play limit, discard batch cap and starting action allowances are centrally configurable in `DEFAULT_ROUND_RULES` and validated.
34. **Progressive length:** Every four completed rounds increases scoring hands by one; every six increases discards by one. Both rates and the target formula are provisional; true unlimited-per-round action capacity could be a later upgrade.
35. **Run state is separate from durable progression:** `RunState` holds phase, current round, score toward current target, run-total score, remaining hands and discards, hand, draw/played/discarded piles and last scored hand. It deliberately does not define wallets, purchases, persistent benefits or transcendence.
36. **Scoring vs committed cards:** Exactly five cards are committed during a play. The selected eligible scoring subset (automatically or manually selected when perk is unlocked) earns base chips × multiplier, but all five committed cards leave the hand.
37. **Discard action:** Selecting one to five cards consumes one discard action and draws replacements without chips earned. Input validation and state transitions live in the framework-independent engine, not the Nuxt component.
38. **Recycling is required:** When the draw pile is depleted, spent played/discarded cards are shuffled into a new draw pile so deck exhaustion never independently loses a run. Injections for randomness retain deterministic tests and SSR-safe starting states.
39. **Round gates:** Reaching the target enters `round_won`, requiring explicit Next round. Exhausting scoring hands before the target enters `game_over` and disallows further scoring/discarding. A new run restarts score and round.
40. **No fake perk economy:** The previous Manual Selection developer preview stays labeled as nonpersistent; purchased perks and permanent privileges have not been implemented. Scoring chips are not represented as spendable currency.
41. **Visible acceptance:** The homepage shows Milestone 4, targets, counters, progression, defeat and restart, while keeping scoring-option radios and favicon. Vitest validates engine transitions, and SSR smoke asserts the Milestone 4 controls and initial values.

## Milestone 5 decisions

42. **Run-only economy:** Gameplay scoring chips track chip thresholds and cumulative scores. A separate `RunProgress.upgradeChips` balance is spendable at any point during an active run. Winning awards `max(1, floor(roundChips / 10))` upgrade chips without subtracting scoring chips.
43. **Idempotent reward:** The pure progression engine tracks `rewardedThroughRound` and rejects duplicate payouts or skipped-round claims.
44. **Always-open shop:** Purchases are permitted in both `playing` and `round_won` states when the player has enough upgrade chips. The shop remains visible after `game_over`, but purchases are disabled because run-only upgrades would have no effect. Costs increase by level, perks have explicit caps, and insufficient balances are rejected.
45. **Upgradeable limits:** Run-level upgrades adjust a snapshot of `RoundRules` at the start of the next round (not mid-hand): held cards, cards committed per play (up to eight in this version), cards discarded per action (up to eight), hands per round and discards per round. Hardcoded UI count restrictions are replaced by effective rules.
46. **Earned Manual Selection:** The developer preview button is removed. Manual mode is unlocked by an actual run-only purchase. Automatic stays available, chooses the highest-ranked category and disables scoring-choice radio buttons.
47. **Not persistent:** All shop currency and purchases reset when the run restarts. Separating `RunState` from `RunProgress` is a foundation for later separate permanent progression/transcendence; no fake meta-upgrades or backend account persistence.
48. **Visible milestone gate:** Homepage reads Milestone 5, shows wallet and shop with clear enabled/disabled purchase states, and retains round UI, favicon, API health and scoring controls. SSR smoke asserts the shop and starting balance; engine unit tests validate rewards, purchasing and effective rules.

49. **Open during gameplay:** The perk shop is always visible. Purchases may happen while playing or after winning a round. Current-round rule values are snapshotted to avoid unexpectedly changing hand size, cards per play, discard caps, or available actions mid-round. Newly purchased numeric upgrades take effect the following round; Manual Hand Selection takes effect immediately. A purchase does not clear selected cards or interrupt the current hand.

50. **UI component boundaries:** Milestone 5 separates the formerly monolithic `index.vue` template into `RoundStatus`, `PlayingCardHand`, `ScoringPanel`, `PerkShop`, `DevelopmentProgress` and `SystemStatus` Vue SFCs under `apps/web/app/components`. Keep the page as the single stateful coordinator, pass typed props down, and emit typed UI intents up; pure `packages/engine` remains the rules authority. No behavioral changes or milestone renumbering are part of this refactor.

51. **Hand display sorting:** Sort buttons reside inside `PlayingCardHand.vue`, with presentation-only modes for dealt order, descending rank, and suit grouping ♠ ♥ ♦ ♣. The pure `sortHandForDisplay` helper preserves original indices so card selections and scoring highlights remain correct. Sorting does not mutate game state, change card draw order or require an unlock. Initial SSR retains dealt order.

52. **Upgraded card-count semantics:** Cards per Play represents the maximum, not a forced exact number. Every scored play commits at least five cards and at most the purchased limit (currently up to eight), preserving five-card poker even after upgrades. Purchasing this perk immediately updates the current round's maximum, while other action/hand limits stay snapshotted until the next round. Engine validation and the Nuxt scoring preview use the same 5..maximum range. Tests cover both five- and six-card plays after purchase and a six-card Three Pair.

53. **Cards per Play is a ceiling, never a floor:** Scoring is permitted with 1..maximum selected cards; High Card is available even for a single card and remains manually selectable for particular cards after its perk unlock. All committed cards are consumed and replaced, while the scoring subset determines chips. The one scoring-hand action cost is independent of how many cards are committed. The default cap is five, with purchasable increases up to eight. The UI preview and engine validate the same range.

54. **Random SSR opening hand:** The initial run uses normal random deck shuffling and Nuxt `useState` to transfer the server-generated deal to the client during hydration. Do not seed the entire game to the same eight cards on every page load. Subsequent new runs and rounds continue to shuffle normally.
55. **Rank default:** `PlayingCardHand` initializes its presentation sort mode to Rank (descending); Suit and Dealt order remain optional and sorting never mutates the engine's hand.
56. **Size-based scoring:** Extended Straight, Flush, Full House, and Straight Flush increase base chips by 25% of their five-card base value for each **qualifying scoring card** beyond five, rounding to integer chips; the category multiplier stays unchanged. Five-card values, independent Three/Four Pair categories and other scoring patterns are unaffected. Automatic remains strongest poker ranking, not highest adjusted score. Balance constants may change later.

57. **Immediate purchase application supersedes previous deferred-round decision:** Purchases of all run-only upgrades now affect the current round immediately. Held-card increases draw real cards and append them without modifying existing held cards/selected indexes, and spent cards can be recycled if the draw pile is exhausted. Additional hand/discard actions increase remaining allowances by the purchased delta; consumed actions are not reset. Card-per-play and discard maximums change immediately; Manual Selection unlocks immediately. Separate upgrade-chip wallet and run-only reset behavior stay unchanged. The engine owns the immutable transition `applyPurchasedRuleUpgrade`; the Nuxt page commits its resulting state only after purchase/rule validation succeeds.
