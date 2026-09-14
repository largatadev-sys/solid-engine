# 02: `mytrips` is minted and takes `GET /v1/trips`

**What to build:** the Trips list is served by a read-surface module of its own, the way Home, Discover and Profile already are, and a traveler cannot tell. `mytrips` owns the one route, composes it from `trip.api`'s batched call (ticket 01) and the publication-state port read where it lives today in the kernel (record round 1 Q4), and owns no table, no repository and no query. `TripController` keeps its ten acts and loses the list. The module is born classified: its boundary guard follows `feed`, `discovery` and `profile` to the letter — an allowlist naming only `trip.api` and `common`, and the owns-no-table rule that fails the moment an entity or a repository appears — and the guard meta-test's list of guarded modules gains `mytrips`, so a module added from here without a guard still fails its first build. The name is `mytrips`, not `trips`: one letter from `trip` in every listing and allowlist is the near-name trap this tree has already paid for (record round 2 Q5). The criterion that mints it is the one ADR-039 decision 4 now carries — the surface owns its wire contract — not a count of the modules it reads (spec decision 2).

**Blocked by:** 01 — the batched `trip.api` call is what the new module composes; without it the move drags six lookups across a module line.

**Status:** ready-for-agent

- [ ] `GET /v1/trips` is served from `mytrips`; `TripController` no longer declares it and keeps its other ten routes untouched
- [ ] `mytrips` reads only `trip.api` and `common` — its boundary guard has the three-surface shape (composes-apis rule with that allowlist, owns-no-table rule) and is **sabotage-checked with a real usage**, not an unused import: a planted repository, and a planted import of a `trip` internal, each fail by name
- [ ] The guard meta-test lists `mytrips` among the guarded modules and stays green; the api-is-never-wire rule stays green
- [ ] Every IT that reaches `GET /v1/trips` passes unedited — the assertion-line diff reports zero moved assertions across the branch so far
- [ ] The module carries no `api` package, per ADR-038 rule 1 as amended — nothing calls it in process — and the unit suite says so the same way it does for the other api-less modules
- [ ] A clean `mvn -o clean test-compile` loop is quiet before the commit, and `git diff --name-only` is empty before it — a module move is exactly the shape where the index ships less than the tree

## Comments

*None yet.*
