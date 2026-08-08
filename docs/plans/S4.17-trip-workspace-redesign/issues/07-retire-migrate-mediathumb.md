# 07 — Retire the three old surfaces, migrate every reference, extract MediaThumb

**What to build:** the consolidation's cleanup (spec decisions 1, 12) — the planner, day view and old overview leave the tree with no dead references, and the five hand-copied authenticated-thumbnail shapes become one component.

**Blocked by:** 02, 03 (the replacements must exist first).

**Status:** needs-triage

- [ ] Routes retire: `days/index`, `days/[dayId]`, and the old overview composition of `[id]/index` (the route itself becomes the viewer).
- [ ] Every inbound reference migrates: trips-list card taps (all own unpublished states → the viewer) · S4.15's "Open Trip Workspace" (goes live) · publish-success's "Back to Trip Workspace" · the preview's published-state button · any `?day=` deep links (redirect to the workspace, day expanded).
- [ ] `tsc` + a grep prove no reference to the retired routes survives; back navigation from viewer lands on Trips (the S4.13 single-stack rule holds).
- [ ] `MediaThumb(size, fallbackIcon)` extracted; the five call sites (`Avatar`, `AvatarStack`, `PublishedItineraryView`, `CoverThumb`, `SummaryThumb`) and the new workspace usages consume it; the component makes the authenticated path the only path (the S3.3 trap's structural defence). The epic-map line is discharged.
- [ ] Anything the old surfaces carried that has no new home is either re-homed by an earlier ticket or named in the spec's Comments — nothing silently dropped.
