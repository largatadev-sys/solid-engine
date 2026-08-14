# 04 — The published total says "From ₱X" when it's partial

**What to build:** A forker reading a published itinerary sees an estimated total that never poses as complete: when at least one activity has no stated cost, the Est. Cost stat reads **"From ‹formatted sum›"**; when nothing is priced, no cost stat renders at all (never "From ‹0›"). An explicit 0 counts as stated. Vertical through both layers: the backend's estimated-total computation gains the partial fact, exposed as one additive boolean beside the existing estimated-cost object on the published response; the mobile stat renders the prefix. The single-currency collapse (no total when stated prices span currencies) is unchanged, partial or not, and every amount keeps rendering in its stated currency's own sign.

**Blocked by:** None — can start immediately.

**Status:** done

- [x] The published response carries an additive boolean beside the estimated cost: true iff at least one activity has no stated cost; an explicit 0 counts as stated
- [x] With no activity priced, the estimated cost is absent entirely — no total, no marker
- [x] The mixed-currency collapse is unchanged: stated prices spanning currencies produce no total, partial or not
- [x] The mobile Est. Cost stat renders "From ‹sum›" when the boolean is set, the plain sum otherwise, and nothing when the total is absent
- [x] Backend IT on the published view covers the four rules; mobile projection tests cover the label
- [x] /v1 additivity holds: no existing field renamed, retyped, removed or re-semanticized
