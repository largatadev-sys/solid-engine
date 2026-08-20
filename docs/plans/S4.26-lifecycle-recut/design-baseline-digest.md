# S4.26 design-baseline digest — the Trips canvas, reconciled against the spec

**The design baseline landed 2026-08-20 and is archived beside this digest**: `Trips Spec.dc.html` (six frames, component contracts C1–C6, motion contracts M1–M4, a live demo) and `design-handoff-README.md` — both **character-repaired archival copies** (the conversation transfer mangled their UTF-8 punctuation — `·`, `—`, `→`, `≥`; layout values, colors and copy are otherwise verbatim, and the only judgment calls were punctuation inside demo fixture strings). **Still wanted from the founder: the original `support.js` export dropped beside the canvas** — it is the generated Claude Design runtime the live demo renders with; it carries no design decisions, and retyping 1,500 lines of generated JS invites silent corruption, so it is not reproduced here. The frames read fine as source without it. Under the mock-fidelity rule the canvas is **normative**: its annotations are rulings, its copy strings are exact. This digest records what it settles, what it amends, and the one conflict it opens.

## What the canvas confirms (ruled at the grilling, honored)

Three fixed equal-width in-page tabs **Upcoming | Ongoing | Completed**, ladder order, always visible · adaptive landing (Ongoing iff ≥1 trip, else Upcoming — never Completed) · no lifecycle badge, date overline or draft subtitle on any card · publication badge and editing advisory stay on cards · per-tab one-line empty states · drawers on both Start Trip and Complete Trip, non-destructive styling, no undo affordance · dead labels **Draft / Ready / Active** render nowhere · trip-screen badge reads Upcoming / Ongoing.

## Open choices the canvas resolves *(were the founder's to make on the canvas — now ruled)*

- **Archived gets its door**: quiet underlined text link **"Archived trips"**, Completed tab only — list footer and Completed's empty state. Never a tab. *(This closes the "archived list has no door" fact the spec recorded.)*
- **No tab counts, no icons, no swipe-between-tabs.**
- **Header**: search stays; no + icon — create lives only in the Plan a Trip bar.
- **Cancel labels are stateful**: Start's cancel reads **"Not yet"**, Complete's reads **"Still travelling"** (annotated changes from generic Cancel — the drawer's dismissal says what staying means).

## Canvas amendments to spec details *(the baseline supersedes the spec's wording — recorded per the immutable-intent rule)*

1. **The Plan a Trip bar is pinned on the Upcoming tab always — populated and empty alike** (C4), amending spec decision 6's "create CTA only on Upcoming's *empty state*". The shipped always-on bar is narrowed to one tab, not to one state. Ongoing/Completed never carry a create entry.
2. **Session-sticky tab**: within a session the user's last-selected tab wins over the adaptive rule (C2's second sentence — new, sensible, testable).
3. **The card gains a destination sub-line** ("El Nido, Palawan · 5 days") **and drops the date overline** (`tripCardDate` retires from this card).
4. **The editing advisory goes amber** (#D97706 dot, #B45309 text) — annotated rationale: amber = transient condition; terracotta stays identity/action. Today's dot is `colors.accent`.
5. **A motion contract, M1–M4, normative** — tab underline slide (200ms, transform-only, native driver), the drawer enter/exit (**M2 becomes the app-wide sheet pattern** — Discovery's filter sheet, Fork's sheet, and the dump picker inherit its numbers), confirm handoff (CTA dims in flight, badge crossfades, **no re-bucket animation, no auto tab-switch**), press feedback, and Reduce Motion behavior. All motion transform/opacity.

## The one CONFLICT — a decision the founder owes before tickets

**The card's "· N days" count is not on the listing wire.** `GET /v1/itineraries` maps through `ItineraryResponse.summaryOf(...)`, which sends `days: List.of()` ([ItineraryResponse.java:63](../../../backend/src/main/java/com/largata/itinerary/api/ItineraryResponse.java)) — the full days array exists only on the detail read. Same shape as the S4.21 `DiaryTripResponse` sub-line gap: the client-side join is wrong by construction. Two honest options:

- **(a) Recommended: additive `dayCount` on the listing response** — one integer, trivially ADR-008-compatible (no waiver), one line in `summaryOf` + the count query. Amends the spec's "tabs need zero wire changes" note, which was true of the ruled behavior and stops being true of this canvas line.
- **(b) Drop "· N days" from the sub-line** — destination only; a named deviation from the baseline.

## README corrections *(the handoff text errs where the canon knows better — the canvas frames are unaffected)*

- The README's title says "Lifecycle S3"; the story is **S4.26**. Traceability lives here, not in the export.
- The README instructs `state === 'draft' || 'upcoming' → Upcoming` as a client-side fold. **Do not implement draft handling**: V36 remaps every row and the wire never emits `draft` again, so the mobile `ItineraryState` type deletes `'draft'` and the fold cannot typecheck. The bucket mapping is `upcoming → Upcoming`, nothing more.
- `archiveControls.ts` (named in C6's annotation) does not exist; the archived list is `app/(tabs)/(trips)/itineraries/archived.tsx`.

## Facts verified against the tree (2026-08-20)

`InvitationInbox` is the list header on the shipped screen (trips.tsx:69) and the README keeps it on every tab — confirmed accurate · `colors.scrim` exists (`tokens.ts:41`), and the canvas's rgba(27,38,59,.55) is exactly `workspaceTokens.scrim` · the drawer's primary labels match `workspaceControls.LADDER` verbatim (Start Trip / Complete Trip).
