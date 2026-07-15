# REGRESSION_CHECKLIST — Largata

**The ratchet (06b §7):** every bug that escapes to a human adds a line here. Before each release candidate, run the lines below by hand (or confirm their automated coverage). **A line that recurs graduates into the Maestro smoke suite** — move it, note the flow name, strike it here.

Automated smoke suite (Maestro, per release candidate — 5–8 flows, pinned): sign in → create itinerary → invite → add item → log expense → publish. *(Flows land with their epics; the suite completes as launch scope completes.)*

| # | Added | Check | Origin (bug/story) | Status |
|---|-------|-------|--------------------|--------|
| 1 | 2026-07-15 | A request to a path that maps to no handler returns **404 + the error envelope**, never 500 / never a Spring error page. | S0.1 — shipped as `500 INTERNAL_ERROR`; 34 tests missed it because every test hits routes that *exist*. Found by curling a nonexistent path at the story gate. | ✅ automated — `ErrorContractIT.unknownRouteIs404InTheEnvelope` |
