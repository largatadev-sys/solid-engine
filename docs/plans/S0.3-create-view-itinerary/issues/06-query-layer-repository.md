# 06 — Mobile: TanStack Query layer + itinerary repository

**What to build:** ADR-001's structure made real. `@tanstack/react-query` as the in-memory stale-while-revalidate store; `itineraryRepository` (list, get, create) on the typed `apiClient`; DTO mirrored in `mobile/src/types/` (the one types location, 06b §6) — `id, title, destinations, startDate, endDate, state, visibility, createdAt`, plus the `{ items, nextCursor }` page shape. Reads go UI → query cache → repository → apiClient; screens never see the network. Create is a plain mutation that invalidates the list query — **no offline write-queue** (ADR-001's queued-writes story is later); **no persistence** (E3 adds the persister to this same layer).

**Blocked by:** 03 — the contract it mirrors (types can be written from the spec; integration needs the endpoints).

**Status:** ready-for-agent

- [ ] QueryClient provider wired at the app root; repositories are the only query/mutation functions
- [ ] List/get read through the cache: warm cache renders without a network call, background refetch updates (Jest, mocked apiClient)
- [ ] Create invalidates the list query; the new itinerary appears without manual refresh
- [ ] Infinite-list wiring consumes `nextCursor` verbatim (opaque — never parsed client-side)
- [ ] 401 → existing sign-in redirect path still holds through the query layer; API errors surface as typed `ApiError`
- [ ] No raw fetch/apiClient call in any screen (grep-clean — ADR-001/P6 hard rule)

## Comments
