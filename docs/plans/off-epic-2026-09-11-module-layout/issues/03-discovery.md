# 03: discovery takes layers

**What to build:** the Discover surface's module reads in the converted shape and the Discover tab answers exactly as it does today. `discovery` is a composition module — no table, no SQL, no in-process caller — and its `api/` holds five response records, all wire. They move to `dto/`, `api/` goes with its named interface, and the two root classes take `service/`.

**The move.** `controller/`: `DiscoveryController`. `dto/`: `DiscoveryCardResponse`, `DiscoveryCountResponse`, `DiscoverySuggestionsResponse`, `PeoplePageResponse`, `TrendingDestinationResponse`. `service/`: `DiscoveryService`, `DiscoveryFilters`.

**Blocked by:** None (can start immediately).

**Status:** claimed

- [ ] Every main-tree class of the module sits in a target folder and the module root holds none
- [ ] `api/` and its `package-info` are gone; the boundary test loses its contract rule on the ticket 01 pattern, keeps the outside-in rule, and is sabotage-checked with a real usage
- [ ] The module still owns no table and no SQL after the move — a repository appearing here would be a module decision, not a layout one
- [ ] The people-search IT and the discovery ITs pass unedited
- [ ] The spec's verification loop, in full, and the structural guards green
- [ ] The last commit sets this ticket `resolved` and flips its ledger glyph; the PR is opened, never merged unasked

## Comments
