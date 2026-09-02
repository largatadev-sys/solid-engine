# 03 — The Pin, stored and on the wire

**What to build:** the data half, end to end, with nothing rendering it yet. Nullable
`latitude` / `longitude` / `zoom` columns on the activity and itinerary tables (`V44`) — **plain
numerics, no PostGIS**: points are stored and never queried spatially, so the extension buys
nothing and costs ops. On the wire a Pin is **nested and nullable** (`pin: {lat, lng, zoom} |
null`) so half a pin cannot be expressed; additive throughout under ADR-008, threaded through
the request, the fields record, the view, the response, the **published** response and the
mobile mirror. **Pins reach the published projection by founder ruling**, which amends INV-11
and INV-2 — so this ticket also writes that amendment into `docs/design/02-domain-model.md`
with its argument (publication requires `completed`, so a published pin is where a traveler
*was*), and adds **Pin** to the domain vocabulary beside **Place**. Forks carry pins. The two
pure rules ship here as tested modules, not as scattered conditionals: **pin validity**
(coordinate ranges, zoom bounds, label required) and the **stale-ref rule** — editing a place's
text clears its pin, compared against the text the pin was dropped with, evaluated at save.

**Blocked by:** None (can start immediately; independent of 01 and 02).

**Status:** ready-for-agent

- [ ] `V44` adds the six nullable columns; a stepped migration IT in the `WorkspaceBackfillIT` pattern proves it, and the sabotage is **grepped for before the run is believed**
- [ ] Pin round-trips through create, read and update on both Activity and Itinerary; absent stays absent
- [ ] Published projection carries pins for activities and the destination; existing published assertions untouched
- [ ] Fork copies pins along with place, time and cost
- [ ] Stale-ref Jest table: typo case keeps the pin, genuine rename clears it, search acceptance is atomic and never self-clears, empty→filled never clears
- [ ] Validity table: out-of-range coordinates, zoom bounds, and a pin without a label are all refused
- [ ] INV-11 and INV-2 amended in the domain model, with the argument recorded — not a silent change
