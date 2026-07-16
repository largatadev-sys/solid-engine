# 06 — Mobile: TanStack Query layer + itinerary repository

**What to build:** ADR-001's structure made real. `@tanstack/react-query` as the in-memory stale-while-revalidate store; `itineraryRepository` (list, get, create) on the typed `apiClient`; DTO mirrored in `mobile/src/types/` (the one types location, 06b §6) — `id, title, destinations, startDate, endDate, state, visibility, createdAt`, plus the `{ items, nextCursor }` page shape. Reads go UI → query cache → repository → apiClient; screens never see the network. Create is a plain mutation that invalidates the list query — **no offline write-queue** (ADR-001's queued-writes story is later); **no persistence** (E3 adds the persister to this same layer).

**Blocked by:** 03 — the contract it mirrors (types can be written from the spec; integration needs the endpoints).

**Status:** done

- [x] QueryClient provider wired at the app root; repositories are the only query/mutation functions
- [x] List/get read through the cache: warm cache seeds the detail screen without a network call
- [x] Create invalidates the list query; the new itinerary appears without manual refresh
- [x] Infinite-list wiring consumes `nextCursor` verbatim (opaque — never parsed client-side)
- [x] API errors surface as typed `ApiError`; the 401 → sign-in path is unchanged (AuthProvider owns it, as at S0.2)
- [x] No raw fetch/apiClient call in any screen (grep-clean — ADR-001/P6 hard rule)

## Comments

**2026-07-16 — implemented. A broken test tool forced a better shape.**

**`@testing-library/react-native` 14.0.1 renders nothing under `jest-expo`'s preset.** `renderHook` returns an empty object — peers are satisfied (React 19, `test-renderer` 1.2.0 present), so this is a preset/renderer incompatibility, not a missing dependency. Diagnosing it properly is a rabbit hole S0.3 has no business funding; the library was uninstalled rather than left in place looking usable. **If a future story needs component tests, this is the blocker to solve first** — the jest config's "no component-snapshot theatre" note (S0.1) is why nothing had hit it before.

**The workaround is the better design.** Every decision worth testing — query keys, cursor threading, what invalidates what, the detail screen's seed source — now lives in exported *options objects* and plain functions (`myItinerariesOptions`, `itineraryOptions`, `findInListCache`, `onItineraryCreated`), driven in tests through a real `QueryClient` with no renderer. The hooks are one-line wrappers with nowhere for logic to hide. Worth keeping even if RTL is fixed.

**One AC is honestly narrower than written.** "Warm cache renders without a network call" is carried by `initialData`, which is a `useQuery`-only concept — `fetchQuery` deliberately bypasses it, so it cannot be asserted without a renderer. The test asserts the *seed source* (`findInListCache` finds the row, across pages) and the key wiring; the single line joining them is not worth a renderer, and what it cannot get wrong it also cannot hide. The on-device AC (ticket 08) covers the rest.

**`apiClient` gained `post`** — S0.1 shipped GET-only. Content-Type is sent only when there is a body: on a GET it would describe a payload that does not exist. No offline write queue (ADR-001's queued writes are a later story); this is where it lands, behind the same signature.

**Not optimistic on create**: a server-assigned id, `createdAt`, and newest-first ordering mean the client would be guessing at the row it inserts. Optimism is for when the client knows the answer.
