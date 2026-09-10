# 04: discovery takes layers, and its five wire records leave `api/`

**What to build:** `discovery` is a composition module (ADR-039 decision 4): no table, no SQL, no in-process caller. Its `api/` holds five response records, all wire. They move to `dto/`, `api/` is deleted, and the two root classes take `service/`.

| Folder | Files |
|---|---|
| `controller/` | `DiscoveryController` |
| `dto/` | `DiscoveryCardResponse`, `DiscoveryCountResponse`, `DiscoverySuggestionsResponse`, `PeoplePageResponse`, `TrendingDestinationResponse` |
| `service/` | `DiscoveryService`, `DiscoveryFilters` |

**Blocked by:** None.

**Status:** ready-for-agent

- [ ] The spec's done-checklist, in full
- [ ] `discovery/api/` and its `package-info.java` are gone; `DiscoveryModuleBoundaryTest` loses its contract rule, keeps the outside-in rule, and says why
- [ ] The module still owns no table and no SQL after the move — the composition classification is a property, and a repository appearing here would be a new module decision, not a layout one
- [ ] `PeopleSearchIT` and the discovery ITs pass unedited

## Comments
