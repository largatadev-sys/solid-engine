# 05 — Trip Delete modal

**What to build:** an owner taps the swipe panel's Delete and a centre-screen modal stops them: title "Delete {trip title}?", the R2-corrected body ("This removes the trip for everyone — the plan, the chat, the photo dump, and every member's postcards leave Largata immediately."), a required acknowledgement tick ("I understand this removes the trip for {memberCount − 1} other members.") gating the CTA, and Cancel. Committing calls **archive** immediately (the ratified semantics — nothing is destroyed), the panel closes, the row collapses after the 120ms beat, and the plain "Trip deleted" toast shows with **no undo** — the owner's Archived list is the unadvertised recovery. Never stacked on a sheet; scrim tap cancels.

**Blocked by:** 04.

**Status:** ready-for-agent

- [ ] The CTA is inert until the acknowledgement is ticked; cancel and scrim-tap leave the trip untouched.
- [ ] Commit sends exactly one archive POST; the trip appears in Archived trips and nowhere else in the owner's app; a member's list drops it at next focus with no residue (two pool travelers, tags stated).
- [ ] Repeat/double-fire lands on the named 409 and surfaces as a quiet no-op.
- [ ] Modal copy renders from the shared copy module and Playwright asserts the R2 strings, not the prototype's.
- [ ] Motion per the handoff (scale/fade 200ms in, scrim 150ms); Reduce Motion keeps the scrim fade only.
