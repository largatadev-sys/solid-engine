# 02 — Trips: swipe-to-reveal, delete modal, leave, trips toast

Status: ready-for-agent
Blocked by: 01, 03

*(01 for the widened FeedToast; 03 for `viewerRole`/`memberCount`. Design baseline `../design/Profile Screen v2.dc.html`, Trips frame; ui-spec Reconciliations govern semantics.)*

## Scope

The shipped Trips screen gains the swipe — no restyle. Swipe left reveals the 96px panel: `colors.danger` + **Delete** when `viewerRole === "owner"`, `textSecondary` + **Leave** otherwise. Swipe constants per the handoff (engage 4px, overdrag 12px, snap past half, 220ms, one open card, tabs close it, pointer capture); the math in a pure module shared by both platform forks. First-arrival peek once per session; skipped under Reduce Motion.

## The wiring map

- **Delete (owner)** → centre modal (scale/fade 200ms), acknowledgement tick gates the CTA, **R2 copy from the shared copy module** — body: "This removes the trip for everyone — the plan, the chat, the photo dump, and every member's postcards leave Largata immediately."; ack: "I understand this removes the trip for {memberCount − 1} other members." Commit calls `archive` immediately; panel closes, 120ms beat, row collapses, **"Trip deleted" toast with no undo** (R3 — the Archived list is the recovery, unadvertised).
- **Leave (member)** → no modal; row collapses, 5s undo toast; the membership DELETE is **deferred behind the toast** (irreversible on the wire); undo = never sent, "You are back in the trip".
- Trips toast is the pill variant (fill `#1C1917`, accent `#EFC9BA`), lifts to clear Plan a Trip on Upcoming.
- Query invalidation: both `archived` list variants + the acting tab; everyone else focus-fresh (S4.34). No WS event.

## Acceptance

1. Owner swipe → Delete → modal (CTA inert until ticked) → commit → row collapses → trip present in Archived trips and absent everywhere else; the wire shows exactly one `POST …/archive`.
2. Cancel and scrim-tap leave the trip untouched; the open swipe panel closes on tab switch and when another card opens.
3. Member swipe shows Leave, never Delete; leave-undo sends nothing; expiry sends exactly one membership DELETE.
4. A member's list drops an owner-deleted trip at next focus with no residue (two pool travelers — `t1` owner, `t2` member; state the tags in the write-up).
5. Modal copy renders from the copy module (Playwright asserts the R2 strings, not the prototype's).
6. Device walk: swipe feel, the peek, Reduce Motion, toast inset over Plan a Trip — the eye's rung (H2 tiers).

## Comments
