# 04 · The Trip Created overview screen

Status: needs-triage

Spec decisions 2 and 3 — the decision-11 reversal made concrete. `[id]/published.tsx` (publish success) is untouched; behavior-identical tests around it must stay green (spec AC 9).

## Scope

- New route under the created trip's id (e.g. `itineraries/[id]/created`), reached from the create screen's `onSuccess` via **`router.replace`** (replacing today's direct `/itineraries/[id]/days` target) so hardware/web back lands on **Trips**, never the spent form. Cover upload's fire-and-forget path unchanged, completing before/alongside navigation exactly as today.
- Layout per the mock's third frame: 72px halo + party-popper icon (mock's own vector) · centered title · body · summary card (64px cover thumb or placeholder, radius 8 · title 700 · 14/17 · meta line) · button dock at the bottom.
- **State-honest copy** (decision 2): title **"Trip Created!"**; body **"「title」 is saved to your trips. Open the workspace to start building the days."** The mock's "available for travelers to discover and fork" must not appear anywhere.
- Summary meta: **"Destination • N Days"**; destination alone when Duration was skipped.
- Primary **"Open Trip Workspace"** (mock styling, chevron) ships **greyed**, firing `comingSoon` on both platforms (web alert fork — S1.3 rule); it is re-pointed at the new workspace screen by the workspace-redesign story, never at `[id]/index`.
- Secondary **"Preview Trip"** (outline, mock's secondary slot) → `/itineraries/[id]/preview`.

## Acceptance

- AC 3, 4, 9 of the spec.
- Unit: copy strings pinned (they encode the reversal decision) · meta-line branch (with/without duration).
- Emulator: create → overview → back lands on Trips showing the new trip; create → Preview Trip → "Continue Editing" reaches the day builder. Web preview: same walk via drive-preview.js, greyed button's `window.alert` intercepted and asserted.

## Comments
