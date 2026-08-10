# 05 — The editor stages

**What to build:** The Draft Workspace stops writing to the server. It renders from the staged draft (initialized when the Editing Session is acquired); the in-editor ops — Add a Day, the day pencil's blur-commit rename, day delete, activity delete, drag/nudge reorder — stage into the draft with the exact affordances S4.19 shipped, only the persistence moment moving. **Save Changes becomes true:** dirty → one bulk save, then release + return to the viewer; clean → plain exit, no write, no confirm (spec decision 1). **Back becomes a real discard:** with staged edits, every exit door — header back, hardware back, web router back — confirms "Discard unsaved changes?"; confirming drops the buffer, releases, returns; dismissing keeps editor and buffer (decision 2). Save-in-flight disables the button; any failure keeps buffer, session and editor with the error shown — exit only on success. The per-drop stale-reorder retry machinery dies with its mutation calls. Trip-field edits and invitations reachable from inside the editor stay immediate, untouched (decision 8).

**Blocked by:** 02 — the bulk save endpoint · 04 — the staged-plan module.

**Status:** ready-for-agent

- [ ] While the session is held, none of the in-editor ops produces a network write — asserted on the driver's API-request log and the backend log's silence, never the render (spec AC 1).
- [ ] Save Changes with a dirty buffer issues exactly one plan write; a fresh read shows the staged plan; the session is released; the viewer is shown. Clean buffer: exits with no write and no confirm (spec AC 2).
- [ ] Back-exit with staged edits confirms on all three doors; Discard leaves the server plan untouched (proven by reload) and releases the session; dismissing keeps editor and buffer (spec AC 3).
- [ ] A failed save keeps buffer, session and editor, shows the error, and the button re-enables.
- [ ] The stale-reorder retry code and its per-drop mutations are gone; reorder is buffer-only until save.
- [ ] Trip-field edit and invite from inside the editor persist immediately, unchanged (spec AC 8).
- [ ] Save Changes keeps the mock's secondary styling — semantics change, pixels don't (spec deviations: none).
