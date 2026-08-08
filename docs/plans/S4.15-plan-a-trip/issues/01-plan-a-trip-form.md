# 01 — The Plan a Trip form

**What to build:** Planning a trip starts from one door and speaks the ratified language. The traveler taps the landing CTA and lands directly on a form titled **"Plan a Trip"** whose fields prompt instead of showing sample content — "Name your trip" · "Where to?" · "Days" · "Best months to go" · "What's this trip about?" · "Add a standout" — styled to the mock's create-entry frame (filled inputs with the near-black hairline border, normalized to Inter and the theme tokens, spec decision 9), and submits with **"Create Trip"**. The create-method chooser no longer exists anywhere; the legacy create path still resolves and lands on this form (spec decision 7 — the shim redirects, it does not die). Field set, validation, day-minting and the cover-upload flow are untouched (spec decision 8).

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [x] The form is titled "Plan a Trip" and submits via "Create Trip" (spec AC 2).
- [x] Placeholders are exactly the six strings above; required fields and validation behave as before.
- [x] Fields, labels, cover zone and footer dock render the mock's create-entry styling per spec decision 9.
- [x] No route in the app renders the chooser; the legacy create path redirects to the form; typecheck is clean after the removal (spec AC 1, chooser half).
- [x] Copy strings that encode decisions (title, submit label, placeholders) are pinned by unit tests.
- [ ] The form walks end to end on the emulator and the web preview container.

## Comments

- *2026-08-08, implementation:* code complete, typecheck clean, full mobile suite green (1933 tests). The unticked box is the **three-rung walk** (spec AC 8) — it needs the local rig (docker compose + the preview container + the emulator) and has not been run, so it stays open rather than being claimed. Everything a unit test or `tsc` can close is closed.
