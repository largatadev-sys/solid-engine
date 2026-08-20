# Handoff: Trips Landing Rework (Lifecycle S3) — Largata

> *Archival note (S4.26): this is the Claude Design export's README, archived verbatim beside the canvas (UTF-8 repaired from the transfer). Its "Lifecycle S3" title is the export's own label — the story is **S4.26**. Where this file and the digest disagree, `design-baseline-digest.md` wins: in particular, do **not** implement the client-side `state === 'draft'` fold it describes — V36 remaps the rows and the mobile type deletes `'draft'`.*

## Overview
Replaces the shipped section-list Trips screen with a three-tab landing that matches the new trip lifecycle (**Upcoming → Ongoing → Completed**, one-way), and adds two bottom confirmation drawers (**Start Trip**, **Complete Trip**) on the trip screen. The *Draft* state folds into Upcoming; *Draft / Ready / Active* labels and the Step-back/undo affordance are removed entirely.

## About the Design Files
`Trips Spec.dc.html` is a **design reference built in HTML** — open it in a browser with `support.js` beside it. It is not production code. Recreate it in the target codebase (React Native / Expo, this repo) using its established patterns and the existing theme module. **This spec is the source of truth over current branch behavior** — the shipped screen is the thing being replaced. The spec's live demo (bottom right) runs the full flow: tab switch → card → trip screen → drawer; verify your build against it.

## Fidelity
**High-fidelity.** Built on the repo's real tokens (`src/theme/tokens.ts`). Use the token names, not raw hex: accent = `colors.accent` (#D96C4A), text = `colors.textPrimary` (#1B263B), background = `colors.background` (#FAF9F6), border = `colors.border` (#E2E4E8), secondary = `colors.textSecondary` (#5C6470), scrim = `colors.scrim`. Copy strings are exact.

## Files to change (this repo)
- `app/(tabs)/(trips)/trips.tsx` — SectionList → tabbed lists; adaptive landing; per-tab empty states; Plan a Trip bar moves to Upcoming only; `InvitationInbox` stays as list header on every tab.
- `src/itineraries/tripSections.ts` — 4 sections → 3 tab buckets: `state === 'draft' || 'upcoming'` → Upcoming, `ongoing` → Ongoing, `completed` → Completed. Section labels ("Active Trips", "Drafts", …) die. `draftSubtitle` is deleted.
- `src/itineraries/TripRow.tsx` — drop the date overline and draft subtitle; advisory dot goes amber (see C3); `tripRowDestination` unchanged.
- `src/itineraries/workspaceControls.ts` — `BADGES` relabel to Upcoming / Ongoing / Completed (viewer surface); `LADDER` loses the `finish-planning` rung (Upcoming's rung is `start`); `showsStepBack`, `stepBackWording`, and `STEP_BACK_WORDING` are **deleted**, not restyled.
- New: shared confirmation drawer component (see C5) used by both ladder acts; wire it where `FinalizeSheet`/confirm flows live today.

## Component contracts

### C1 · TripTabRow
Exactly three equal-width in-page tabs, ladder order **Upcoming | Ongoing | Completed** — fixed, all always visible even when empty. Active: 700 weight `textPrimary` + 3px `accent` underline (radius 100 top corners); rest: 400 weight `textSecondary`. Label 14px. No counts, no icons, no swipe-between-tabs gesture. Height ~44 incl. 1px `border` bottom hairline.

### C2 · Adaptive landing
On entering the Trips tab: land on **Ongoing** if it holds ≥1 trip, else **Upcoming**. Never Completed. Within a session, the user's last-selected tab wins over the adaptive rule.

### C3 · TripCard
Exactly five slots — nothing else:
- 76px cover thumb, radius 12, `surfaceMuted` fallback with map icon (as today)
- title — `typography.cardTitle`, 1 line, ellipsized
- destination line — `typography.cardSubtitle`, `textSecondary` (e.g. "Kyoto, Japan · 6 days")
- optional **Published** pill, right-aligned — bg rgba(217,108,74,.08), text `accent`, 11/600, radius pill
- optional advisory "Currently being edited" — 8px amber dot #D97706 + 11/600 amber text #B45309 (changed from terracotta: amber = transient condition)

**Never:** lifecycle badge, date overline, draft subtitle, or the words Draft / Ready / Active. Card container: `surface` bg, 1px `border`, radius 16, padding 12, row gap 12. Whole card pressable → workspace (published + not archived → published view, via `tripRowDestination`).

### C4 · Empty states + create entry
One line per tab (exact copy):
- Upcoming: "No trips on the horizon yet."
- Ongoing: "No trip underway right now."
- Completed: "Trips you've travelled will collect here."

Create = the **Plan a Trip** bar (height 51, `accent` bg, radius 4 = `radii.control`, label 15/600 white + plus glyph), pinned to the bottom of the **Upcoming tab only** — populated and empty alike. Ongoing and Completed carry no create entry anywhere. The shipped always-on CTA bar is narrowed to this, not removed.

### C5 · Confirmation drawer (one component, two wordings)
Opened only by the ladder CTA inside the trip screen — never from a list card. Anatomy top-to-bottom: 36×4 handle (`border` grey, pill) · title 22/700 `textPrimary` · one-line body 13.5 `textSecondary` · primary CTA (height 51, `accent`, radius 4, label 16/700 white) · quiet text cancel (15/600 `textSecondary`, centered, 44px hit area). Scrim = `colors.scrim`; tap-scrim and swipe-down = cancel. No destructive styling; no undo affordance after confirm.

| | Start | Complete |
|---|---|---|
| Trip badge shows | Upcoming | Ongoing |
| Title | Start this trip? | Complete this trip? |
| Body | Postcards open for every member once the trip starts. | Marks the trip as travelled — a completed trip can be published. |
| Primary | Start Trip | Complete Trip |
| Cancel | Not yet | Still travelling |

State badge (workspace viewer): pill, bg #FBF0EB (`terracotta050`), 1px #EFC9BA (`accentMuted`) border, text #B14E2E, 11/600.

### C6 · Archived
Quiet underlined text link **Archived trips** (12/600 `textSecondary`) as the Completed list footer and on Completed's empty state. Archived trips never appear in the three tabs. Never a tab.

## Motion contract (native-first)
Shared app vocabulary (from Polls/Profile): color 150ms ease-out · pop 200ms cubic-bezier(0.34,1.56,0.64,1) · layout 200ms ease-in-ease-out · progress/travel 300ms · press 100ms.

- **M1 · Tab switch** — underline slides 200ms ease-out (translateX only, `useNativeDriver: true`); label color 150ms; incoming list fades in + rises 8px, 150ms ease-out. Each tab keeps its own scroll offset. Empty states enter with the same fade-rise.
- **M2 · Drawer enter/exit — sets the app-wide sheet pattern** (Discovery filter sheet, Fork sheet, dump picker inherit these numbers). Enter: scrim opacity 0→1 200ms ease-out; drawer translateY 100%→0 300ms ease-out (transform only, native driver). Exit: drawer down 200ms ease-in, scrim out 150ms, overlapped. `Animated.timing`, not a spring. Web (react-native-web): CSS transitions, same values.
- **M3 · Confirm handoff** — primary CTA disables at 0.85 opacity while in flight (no spinner inside the button); on success the drawer runs its M2 exit and the workspace state badge crossfades 150ms to the new label. The list re-buckets on next visit with **no animation** — no card flying between tabs, no auto tab-switch.
- **M4 · Press feedback** — cards, tabs, CTAs, archived link: opacity 1→0.85, 100ms in / 150ms release. Pull-to-refresh: platform spinner.

Card → trip screen navigation uses the navigator's platform push — no custom transition. **Nothing else animates.** All motion is transform/opacity. Reduce Motion: M1 content rise and M2 drawer travel jump-cut (scrim still fades 150ms); M4 stays.

## Dead labels — must not render anywhere
`Draft`, `Ready`, `Active`, "Every trip starts as a draft…" (old empty copy), "Continue editing your Trip Workspace" (draft subtitle), all Step-back wording ("Reopen planning?", "Undo starting…", "Undo completing…").

## Files
- `Trips Spec.dc.html` — the spec: 6 frames, contracts, interactive demo (open in a browser)
- `support.js` — runtime required by the spec file (keep beside it)
