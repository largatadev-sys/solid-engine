# 03 — Capture on the viewer: the links, the composer, the success screen

**What to build:** The mock's frames 3–4, live. On an `ongoing`/`completed` trip, every activity row on the workspace Day-by-Day viewer carries the trailing link — **Add to Diary** when the viewer has no entry for it, **Added ✓** when they do (per-viewer state from the mine query; no links in `draft`/`upcoming`). Add to Diary pushes the composer exactly as Frame 3 draws it: snapshot header (eyebrow + activity title), device-photo section (multi-pick), Photo Dump section reading the trip's pool (honest empty state when the dump is empty), caption field, the info note — **"Only you can see your diary. It shows up on your profile."**, verbatim — and the CTA. Submit runs the one-act create; success renders Frame 4 and returns to Day-by-Day. Added ✓ opens the existing entry for editing (caption + photos, ticket 02's acts) — the edit door is undrawn, designed from theme, a named deviation. The workspace chrome around the links does not change (day-execution is backlogged).

**Blocked by:** 01 — The postcard on the wire · 02 — Entry management · S3.4 ticket 01 *(the composer's dump section reads the pool's list)*.

**Status:** done

- [x] The end-to-end walk: ongoing trip → Add to Diary → two device photos + one dump photo + caption → success screen → Added ✓ on the row — web preview and emulator both, media bearer-authenticated throughout, entered through the real affordance, never a direct route (spec AC 1; the S4.18 lesson).
- [x] No links render on `draft`/`upcoming` trips; a completed trip shows them (spec AC 2, 3 — client half).
- [x] The info-note copy is exact (spec AC 11); the composer refuses submit with zero photos client-side and surfaces the server's named refusals honestly.
- [x] Added ✓ opens the entry; edit and delete round-trip; delete reverts the row's link (spec AC 10 — client half).
- [x] Jest: pure modules for added-state derivation and snapshot/anatomy mapping (the `landingSlot.ts` extraction precedent); repository tests; analytics events for create/edit/delete (spec AC 12).
