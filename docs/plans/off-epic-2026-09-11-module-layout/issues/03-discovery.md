# 03: discovery takes layers

**What to build:** the Discover surface's module reads in the converted shape and the Discover tab answers exactly as it does today. `discovery` is a composition module — no table, no SQL, no in-process caller — and its `api/` holds five response records, all wire. They move to `dto/`, `api/` goes with its named interface, and the two root classes take `service/`.

**The move.** `controller/`: `DiscoveryController`. `dto/`: `DiscoveryCardResponse`, `DiscoveryCountResponse`, `DiscoverySuggestionsResponse`, `PeoplePageResponse`, `TrendingDestinationResponse`. `service/`: `DiscoveryService`, `DiscoveryFilters`.

**Blocked by:** None (can start immediately).

**Status:** resolved

- [x] Every main-tree class of the module sits in a target folder and the module root holds none
- [x] `api/` and its `package-info` are gone; the boundary test loses its contract rule on the ticket 01 pattern, keeps the outside-in rule, and is sabotage-checked with a real usage
- [x] The module still owns no table and no SQL after the move — a repository appearing here would be a module decision, not a layout one
- [x] The people-search IT and the discovery ITs pass unedited
- [x] The spec's verification loop, in full, and the structural guards green
- [x] The last commit sets this ticket `resolved` and flips its ledger glyph; the PR is opened, never merged unasked

## Comments

**2026-09-11 — the outside-in rule took a stronger form than this ticket's wording, raised at the series' code review (spec axis).**

The ticket says the guard *"keeps the outside-in rule"*. Discovery publishes no refusal either, so after the `api/` deletion it has **no front door at all** — and the rule was widened from *nothing outside may reach behind the front door* to **nothing outside may name any part of the module**. Strictly stronger, and verified: nothing outside `com.largata.discovery` names any of it. Sabotage-checked with a real field usage.

Recorded because only ticket 14 states that form in its own text; 03, 05 and 14 all ship it.

