# 04 — The diary tab stops swallowing

**What to build:** Spec decision 3, mobile only. The profile diary tab renders failure as failure: a failed trips fetch shows a visible error with retry instead of the empty-diary text (today an errored query renders `rows.length === 0` and the tab lies "no diaries yet"); a failed per-trip expansion renders an inline error in the section body with retry, instead of an empty section. The pattern is the trip-diary screen's existing error message — reuse its shape and wording conventions, don't mint a parallel one. This is the surface where the fence bug was *felt*; the silencer goes with the cause.

**Blocked by:** None — client-side, independent of the backend tickets.

**Status:** ready-for-agent

- [ ] A trips-fetch error renders the error state with retry, never the empty state; retry refetches and recovers (spec AC 6).
- [ ] An expansion error renders an inline section error with retry, never an empty section (spec AC 6).
- [ ] Jest at the state seam per the trip-diary-screen precedent; the existing section-mapping tests stay green.
- [ ] The empty state still renders only for a genuinely empty, successfully-loaded diary.
