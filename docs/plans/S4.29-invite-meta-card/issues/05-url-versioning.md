# 05 — URL versioning: the counter and the handed-out `?v=`

**What to build:** An additive `share_card_version` counter on the itinerary (the `plan_version` pattern: DB-owned, read-only to the ORM — and explicitly *not* `plan_version` itself, whose own migration excludes these fields). It bumps when any card input changes — **title, destination, dates, or cover** (destination is the recorded correction to the parked design) — and on nothing else. The server-composed share URL always carries `?v=N` from `v=1`, and ticket 03's `og:image` URL carries the same `v`. The server never reads `v` anywhere: it is purely a platform-cache key, which is what guarantees a fresh scrape of any version renders current data. Past shares stay untouched (founder scope cut). Zero mobile code — the client copies the URL opaquely and its token parser already ignores query strings, with a test pinning it.

**Blocked by:** 03 — the preview whose `og:image` URL carries the version.

**Status:** ready-for-agent

- [ ] Additive migration only; the schema diff is one column with a default
- [ ] ITs per trigger: title, destination, start/end dates, and cover set/replace/remove each bump exactly once; plan edits, lifecycle transitions, chat and membership writes do not
- [ ] The join-link endpoint returns the share URL suffixed `?v=N`; a fresh trip hands out `v=1`
- [ ] The preview's `og:image` URL carries the same `v` as the page URL (spec decision 13)
- [ ] Grep-level assertion in review: no server code path reads the `v` parameter
- [ ] No mobile diff
- [ ] Demoable: share-link → edit title → share-link again shows the bumped suffix; both URLs' cards render current data
