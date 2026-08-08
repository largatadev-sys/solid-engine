# 01 — The Editing Session on the API: an itinerary-wide lease subject

**What to build:** the exclusive whole-itinerary hold behind Edit Itinerary (spec decision 4, ADR-022) — a new, additive lease subject: acquired on entering the Draft Workspace, released on Save Changes/exit, TTL self-healing, enforced on every plan write, readable for the "being edited by …" advisory.

**Blocked by:** None — can start immediately.

**Status:** needs-triage

- [ ] The lease subject set gains an itinerary-wide session value, additively — the shipped header/day/activity subjects keep resolving (no /v1 rename/retype/removal).
- [ ] Acquire refuses while any other traveler holds the session **or any subject lease** on the same itinerary (a mid-edit S4.9-style hold must not be steamrolled); the refusal names the holder.
- [ ] While the session is held, every plan write by a non-holder refuses (days, activities, reorder, move, rename, header) — membership guard first, then lease, the S4.9 order; membership acts (invite, remove, ownership, archive) stay unaffected.
- [ ] The holder's own writes succeed without acquiring per-subject leases — the session subsumes them inside the Draft Workspace.
- [ ] Release on explicit end; TTL expiry self-heals abandonment (the ADR-014 shape); renewal while the editor stays open.
- [ ] The advisory read surface reports the session holder so the viewer can render "being edited by X" and disable Edit Itinerary — pull-based, never presence.
- [ ] ITs cover: acquire/refuse/release/expiry · non-holder write refusal naming why · membership acts passing while held · the archived and published fences still dominating.
