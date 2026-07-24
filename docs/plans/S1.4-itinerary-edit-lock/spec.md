# S1.4 — Itinerary edit lock (single-writer MVP) · spec

**Status:** intent locked 2026-07-24 — grilling session, founder-confirmed. Immutable point-in-time intent (issue-tracker rule): if intent changes during implementation, append to `## Comments`; never rewrite this body.

> **Context anchor.** ADR-014 (this story's decision, authored in `04-architecture.md`) · S1.3 (shipped the LWW behavior this supersedes, and the plan-edit surfaces this locks) · ADR-011/03 (guard order: membership first, then lease) · ADR-001 (offline queue — plan writes leave it here) · ADR-008 (waived for the S1.3 write endpoints, recorded below) · 07-epic-map E1 (the 2026-07-24 reversals paragraph).

> **How this story came to be.** The S1.4 slot was "private comments." At its grilling (2026-07-24) the founder deleted private comments from the domain entirely (Comment is public-only → S4.6; the published-itinerary mock that surfaced the decision is register #5's input, digest beside this spec) and replaced the story with the edit lock, superseding S1.3's last-write-wins. Both reversals are recorded in the epic map and ADR-014.

## Goal

While one member edits a trip's plan, the plan is closed to everyone else — owner included. Entering any plan-edit surface claims a whole-itinerary lease; everyone else gets a modal ("*{name} is editing this itinerary right now*") instead of a form; abandonment self-heals by expiry. The server enforces the lease on every plan write; the S0.3/S1.1/S1.2/S1.3 guard ACs stay green, untouched.

## Locked decisions

### The lease (ADR-014, restated operationally)

- **One row per itinerary**: `itinerary_id (1:1) · holder traveler id · expires_at`. An expired row **is** the unlocked state — reads never need a cleanup job; acquisition overwrites an expired row.
- **Acquire** on entering any plan-edit surface: itinerary fields form, day title edit, activity add/edit, activity reorder, any plan delete. Denied acquire returns the holder's identity (display name) for the modal.
- **TTL ~3 minutes** (exact value + renew cadence at the ticket), renewed while the edit screen stays open. **Release** on save/cancel/back — but expiry is the guarantee; release is courtesy. **No force-take, no admin unlock, owner included** (founder ruling).
- **Server-enforced on every plan-write endpoint**: guard resolves Membership first (ADR-011 — unchanged), then the lease check; a caller not holding a live lease is rejected with a conflict-class error naming the holder (exact status/error code per 05-api-conventions at the ticket). The modal is UI courtesy; the rejection is the rule — this is what makes old clients unable to bypass the lock.
- **Pull-based honesty**: no live lock indicator, no banner appearing on its own, no "it's free now" signal. Lock state is learned only by attempting to edit. Live presence belongs to the post-gate live-editing line.

### /v1 additivity waiver (ADR-008), recorded

The shipped S1.3 write endpoints gain a rejection case — a semantics change within /v1 that ADR-008 forbids. **Waived knowingly by the founder, 2026-07-24**, while the only installed clients are the founders' own (pre-alpha). The lease endpoints themselves (acquire/renew/release) are new and additive.

### Offline consequence (ADR-001, partially superseded), recorded

A minutes-scale lease cannot span an hours-scale offline gap. **Plan editing now requires connectivity**: plan writes leave the offline queue; offline stays read-only for plan content (the read cache is untouched). Entering an edit surface offline fails gracefully at the acquire step — a clear message, never a dead tap.

### The S1.3 AC-7 reversal, executed here

S1.3's IT pinning the *absence* of a conflict surface is removed in this story and replaced by tests pinning the lease surface (the reversal is deliberate and cross-referenced in S1.3's spec Comments). `last edited by/at` attribution is untouched and still shown.

### The modal is a web-fork citizen from day one

The "being edited" modal is exactly the surface `Alert.alert` silently no-ops on react-native-web (the S1.3 grey-out lesson). It ships platform-forked (`.native` / `.web`, shared wording module), and the web AC is closed by driving the preview container with CDP dialog/DOM interception — never by "it renders."

## Backend scope

Additive migration for the lease table · lease service (acquire / renew / release; expiry-aware) · lease check wired into every plan-write service method after the guard (itinerary fields, day CRUD + title, activity CRUD + reorder) · conflict-class error response carrying the holder's display name · register-#2 analytics log events: `edit_lock_acquired / denied / expired_takeover`.

## Mobile scope

Acquire-on-entry for every plan-edit surface through the repository/typed-`apiClient` layer (ADR-001 — no raw fetch) · renew timer while an edit screen is open; release on save/cancel/back · the platform-forked modal with the holder's name · offline: edit entry points fail gracefully (connectivity required message) · plan writes removed from the offline queue · web parity via the shared codebase, verified in the preview container.

## Acceptance criteria

| # | Criterion | Closed by |
|---|---|---|
| 1 | A enters an edit surface → lease acquired; B's acquire is denied **with A's display name**; B's *direct API write* (no lease) is rejected — server-enforced, not UI-trusted | IT |
| 2 | The owner is equally locked out: member B holds the lease; owner A's acquire is denied the same way | IT |
| 3 | Save/cancel releases immediately: A saves, B's next acquire succeeds with no waiting | IT |
| 4 | Abandonment self-heals: A acquires, A's client dies (no release), after TTL B's acquire succeeds | IT (clock-controlled) |
| 5 | Renewal holds a live editor: A's edit screen stays open past one TTL — A's own writes still accepted, B still denied | IT (clock-controlled) |
| 6 | S1.3's AC-7 IT is replaced, not merely deleted: the new suite pins the 409-class surface (the reversal is visible in the diff and named in the PR) | Review + IT |
| 7 | The modal works on the device **and** the web preview (platform-forked; CDP interception proves the web dialog fires with the holder's name) | Device AC (dev build) + `drive-preview.js` |
| 8 | Offline: with connectivity cut, every plan-edit entry point answers with the graceful connectivity message — never a dead tap, never a queued plan write | Device AC |
| 9 | Guard regression: S0.3/S1.1/S1.2/S1.3 guard ACs stay green; the lease check runs *after* membership resolution (a non-member is 404'd by the guard, never told about locks) | Existing ITs + new IT |
| 10 | The founder-visible loop on the layer that ships: post-merge on deployed `dev`, A edits on one device, B sees the modal on another, A saves, B edits | Post-merge check on deployed `dev` |

**Deliberate omissions, on the record:** no lock UI beyond the modal (no banners, no lock icons — pull-based honesty) · no force-take/admin unlock (expiry is the escape hatch) · no per-item granularity · no notification when the lock frees.

## Out of scope

Live editing / presence / concurrent sync (post-gate backlog line) · activity history (same line) · comments of any kind (Comment is public-only → S4.6, register #5) · mentions/notifications (post-gate, S4.6-scoped) · locking anything outside plan content (membership, invitations, future decisions/ledger are untouched) · any non-additive /v1 change beyond the recorded waiver.

## Comments

*(empty — accretes during implementation)*
