# 03 — The Draft Workspace (editor): the accordion, the session, the Finalize sheet

**What to build:** the mock's `workspace-draft` layout as the plan's one editing surface (spec decisions 3–6) — entered via Edit Itinerary under the Editing Session, exited via Save Changes; the day-by-day accordion; Finalize with its confirmation sheet.

**Blocked by:** 01 (session acquire/release), 02 (shared header/tab-row components).

**Status:** needs-triage

- [ ] Entry acquires the Editing Session (spinner/refusal naming the holder on failure); Save Changes releases and returns to the viewer; back-exit releases; the TTL is the abandonment fallback. CTA rail order per frame 1: Finalize Itinerary above Save Changes (`#ECE8E5` border).
- [ ] Header per mock: back · "Draft TRIP Workspace" amber badge · Invite Traveler text-button → existing invite flow · title with the un-hidden pencil → the existing header-edit path · reserved provenance subtitle.
- [ ] Accordion: single day open, Day 1 default; stub tap expands (chevron ⇄ minus); expanded card per mock — title row, divider, activity rows (grip · name · time · pencil · trash), Add Activity CTA.
- [ ] Add a Day (right-aligned text button, calendar-plus): appends via the existing endpoint, expands the new day, focuses its title.
- [ ] Day title: tap → inline input, saves on blur (existing rename path). Day delete: trash affordance in the expanded day's header (named deviation), owner-only, existing guards (409 while a contained activity is being edited does not apply inside the holder's own session).
- [ ] Activity pencil → the activity form (ticket 05); trash deletes with confirm; Add Activity → the form in create mode.
- [ ] Finalize Itinerary → the confirmation sheet (mock copy verbatim; `#EA580C` + app families per the ruled normalization): Finalize fires `finish-planning`, releases the session, lands on the viewer showing Ready; Keep Editing dismisses.
- [ ] Owner-only affordances (Finalize, Add a Day, day delete) hidden for members; activity editing member-wide.
- [ ] Empty states: no-activity day → just Add Activity; no-day trip → just Add a Day.
- [ ] Reorder ships arrows-off only when ticket 04 lands in the same story gate; until merged, handles render with arrows as interim (never handles-that-do-nothing on a shipped build).
