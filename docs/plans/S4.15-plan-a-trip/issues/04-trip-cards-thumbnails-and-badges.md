# 04 — Trip cards: cover thumbnails & publication badges

**What to build:** Every trip card shows the trip at a glance. Cards take the mock's anatomy — 76px cover thumbnail, date above title, title, the existing status slot (lease advisory dot, draft subtitle) — and the current destinations line drops (spec decision 5, stated deviation table). Thumbnails render the media pipeline's **thumbnail variant through the authenticated media path** — never an anonymous image URL (the S3.3 trap); a trip with no cover shows a neutral placeholder tile of the same geometry. Published trips carry a **publication badge** distinguishing public from private in the card's badge slot; unpublished trips carry none (spec decision 4's badge half — the discharged backlog line). Card-tap destinations are unchanged this story; the workspace-redesign story re-points them (spec decision 3c). No backend work — the wire already carries everything needed.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [x] Cards render thumbnail · date-over-title · status slot per the mock; the destinations line is gone (spec AC 6).
- [ ] A trip with an uploaded cover shows its thumbnail on the landing; the web driver's request list shows only bearer-authenticated media requests, and the backend logs no unauthenticated media rejection.
- [x] Coverless trips render the placeholder tile.
- [x] Published trips show the badge with public/private distinguished; unpublished trips show none — pinned by unit tests across the three publication shapes.
- [x] Card taps keep their current per-state destinations.
- [ ] Emulator + web preview verify the card grid against the mock frame.

## Comments

- *2026-08-08, implementation:* code complete, typecheck clean, full mobile suite green (1933 tests). The unticked box is the **three-rung walk** (spec AC 8) — it needs the local rig (docker compose + the preview container + the emulator) and has not been run, so it stays open rather than being claimed. Everything a unit test or `tsc` can close is closed.
