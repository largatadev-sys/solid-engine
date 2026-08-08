# 01 · Trips landing — chrome and copy per the mock

Status: needs-triage

Spec decisions 4 (labels), 6 (chrome), and 9 (styling) — the landing screen minus the cards (ticket 02).

## Scope

- Bottom CTA: **"Plan a Trip"** + the mock's plus-circle icon (white stroke, 18px), styling per the mock's `bottom-cta` block (52px, radius 4, accent background), navigation unchanged (`/itineraries/new`).
- Section labels go plural: **Ongoing Trips · Upcoming Trips · Drafts · Completed Trips** (`tripSections.ts`), order and empty-section hiding unchanged; label styling per the mock (700 · 14/18 · capitalize · secondary gray token).
- Remove the **"Add a Past Trip"** secondary button and its `comingSoon` wiring (scrapped `wontfix` — epic-map line closed).
- Remove the **"Archived trips"** footer link. Routes and archive semantics untouched.
- Header: title styling per mock (800 · 28/36) + **search** and **sliders-horizontal** icons (20px, 2px stroke), each wired to `comingSoon` (platform-forked — the web alert must fire, S1.3 rule).
- Trips tab icon: **briefcase** (mock's `briefcase-fill`), replacing `map` in `(tabs)/_layout.tsx`.
- Screen background/tokens mapped per spec decision 9 (Inter, nearest existing gray tokens, mock geometry verbatim).

## Acceptance

- AC 1, 5 (labels half), 7 of the spec.
- Unit: CTA label + section labels pinned; `comingSoon` fired on search/filter tap (both forks).
- Emulator + web preview walk: icons visibly render, taps alert, no dead clicks; no archived link, no past-trip button.

## Comments
