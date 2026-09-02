# 02 — The `place` module and keyless search

**What to build:** the backend module the whole story's search runs through, born with its
boundaries enforced. A `place` module exposing one service interface — text in, ranked
candidates out (name, coordinates, an OSM kind) — with a **Photon-backed** implementation and a
**fixture** implementation selected by configuration in the `InvitationMailConfig` shape, so no
integration test ever calls Komoot. Nominatim is excluded by its own policy, which forbids
client-side autocomplete outright; do not reach for it. Results are **cached**, and calls are
**rate-limited per traveler** — a typeahead box is the easiest way to accidentally hammer a free
service whose entire terms are "please be fair". The endpoint takes an optional lat/lng bias so
the picker can weight results toward the trip. **The `ArchUnit` boundary pilot ships here**, not
later: nothing outside `place` may reach its internals, and it is referenced by ID and service
interface only (ADR-002) — written the one day it is certainly true.

**Blocked by:** None (can start immediately; independent of 01).

**Status:** ready-for-agent

- [ ] Search endpoint returns ranked candidates with coordinates; the lat/lng bias demonstrably reorders them
- [ ] Fixture suggester selected by config; the IT suite runs green with no network egress
- [ ] Cache hit avoids a second upstream call for the same query; the per-traveler limit refuses politely and is asserted
- [ ] Upstream failure surfaces as a defined, non-500 outcome the client can render as "search unavailable"
- [ ] ArchUnit: nothing outside `place` imports its internals, and the test fails when a violation is planted
- [ ] The module's own outbound identification (User-Agent) names this application, per OSM/Photon policy
