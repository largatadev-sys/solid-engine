# 01 — Profile: kebab sheets, postcard delete, unpublish, undo toast

Status: ready-for-agent

*(Rewritten 2026-08-27 when the design handoff landed — the original blocked-on-handoff ticket is superseded by this one plus 02/03. Read `../ui-spec.md` first; the design baseline is `../design/Profile Screen v2.dc.html` — copy the frames, read the markup for answers. Reconciliations R1–R4 in ui-spec override the handoff's semantics prose.)*

## Scope

The Profile screen's removal affordances: kebab on diary cards, postcard cards and itinerary cards → `members/BottomSheet.tsx` with `MenuEntryRow` entries → collapse → undo toast. The `FeedToast` widening (trailing Undo action + 2px linear drain) happens here — it is the handoff's one component change and ticket 02 consumes it.

## The wiring map

- **Postcard → Delete postcard** (`#B91C1C`): row collapses (M7), 5s undo toast; the `DELETE …/diary/entries/{entryId}` is **deferred behind the toast** — undo never sends it; commit point is the timer. Last postcard in a diary collapses the diary card with it; undo restores both (the diary is a projection of its entries — derive, don't track).
- **Itinerary → Unpublish** (`#B45309`): card collapses out of the Itineraries list, toast offers **Republish** — `unpublishTrip` immediately, undo calls `publishTrip` with the trip's current visibility. Toasts per the handoff's message table.
- **Non-destructive entries**: Edit details → the S4.25 details editor · View published page → the published route · Edit postcard / Edit diary details / Copy public link → existing surface if one exists, else the house measured coming-soon prompt — name each stub in the PR, never a dead click (S1.3).
- **Copy** from a shared `.ts` module (S4.28 `travelerCopy` pattern) — toast messages, menu labels.
- Sheet/motion constants per the handoff (M4–M9); Reduce Motion drops rises/collapses/staggers, keeps scrim fades.

## Acceptance

1. Kebab → sheet → Delete postcard → collapse → undo toast, one overlay at a time; undo restores the row in place and **no DELETE reaches the wire** (Playwright asserts by interception).
2. Toast expiry sends exactly one DELETE; the entry and its photos are gone; the feed drops the postcard.
3. Last-postcard delete collapses the diary card; undo restores both.
4. Unpublish → Republish round-trips the published pill and the public page.
5. Toast supersession: a second removal inside the window commits the first and replaces the toast (pure-module test + Playwright).
6. Full `npx jest` before any push that adds a `src/` file (S4.28 rule); Playwright `--list` parses after adding specs (S4.28 rule).

## Comments
