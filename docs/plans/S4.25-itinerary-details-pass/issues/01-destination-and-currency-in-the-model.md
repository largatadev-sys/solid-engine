# 01 — One destination and a Trip Currency in the model

Status: ready-for-agent

**What to build:** The trip knows its one destination and its one currency, everywhere. One migration adds both facts and backfills them from what already exists; the whole wire and every screen reads the new shape; new trips are born ₱ PHP trips; saving an activity stamps the trip's currency into it. This is the wire break the ADR-008 waiver covers — backend and mobile move together, one slice.

**Blocked by:** None — can start immediately.

- [ ] One migration: adds the trip currency (backfill: the unanimous non-blank currency of the trip's activities when they agree, else `PHP`) and the scalar destination (backfill: **keep-first** from the legacy list — owner-approved destructive step, join declined on the record), then drops the list column.
- [ ] Migration-stepping IT in its own container: steps to the prior version, seeds legacy shapes via raw SQL (multi-destination rows with the derived region *last*; unanimous- and mixed-currency trips; a trip with no priced activities), applies, asserts keep-first and unanimous-else-PHP. **Sabotage-checked** (one altered row fails with a named diagnosis) and run with resource compilation in the goal list.
- [ ] Every response shape that carried the destinations list serves scalar `destination`; create/update requests take the scalar; requests carrying the old list shape are refused by validation, not silently accepted.
- [ ] Discovery search, trending, and destination typeahead operate on the scalar column (no unnest), and their ITs still pass.
- [ ] Creation defaults the trip currency to `PHP` **server-side**; the currency is served on the itinerary wire.
- [ ] Saving an activity writes the trip's currency into the activity's stored currency; legacy rows keep their stored currency until touched.
- [ ] Every mobile reader renders the single destination (published pill, showcase meta line, trip-created copy, the form's destination field) and mobile types match the wire.
- [ ] `tsc --noEmit` clean; affected Jest suites and backend ITs green, counts read from the `Tests run:` summaries, never the exit code.

## Comments
