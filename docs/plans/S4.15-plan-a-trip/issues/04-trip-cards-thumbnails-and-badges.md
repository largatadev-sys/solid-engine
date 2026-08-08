# 04 — Trip cards: cover thumbnails & publication badges

**What to build:** Every trip card shows the trip at a glance. Cards take the mock's anatomy — 76px cover thumbnail, date above title, title, the existing status slot (lease advisory dot, draft subtitle) — and the current destinations line drops (spec decision 5, stated deviation table). Thumbnails render the media pipeline's **thumbnail variant through the authenticated media path** — never an anonymous image URL (the S3.3 trap); a trip with no cover shows a neutral placeholder tile of the same geometry. Published trips carry a **publication badge** distinguishing public from private in the card's badge slot; unpublished trips carry none (spec decision 4's badge half — the discharged backlog line). Card-tap destinations are unchanged this story; the workspace-redesign story re-points them (spec decision 3c). No backend work — the wire already carries everything needed.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [x] Cards render thumbnail · date-over-title · status slot per the mock; the destinations line is gone (spec AC 6).
- [x] A trip with an uploaded cover shows its thumbnail on the landing; the web driver's request list shows only bearer-authenticated media requests, and the backend logs no unauthenticated media rejection.
- [x] Coverless trips render the placeholder tile.
- [x] Published trips show the badge with public/private distinguished; unpublished trips show none — pinned by unit tests across the three publication shapes.
- [x] Card taps keep their current per-state destinations.
- [x] Emulator + web preview verify the card grid against the mock frame.

## Comments

- *2026-08-08, implementation:* code complete, typecheck clean, full mobile suite green (1933 tests). Backend untouched by this story — no IT ran, and none needed to.

- *2026-08-08, walked on both rungs — all boxes close, including the one that mattered most.* A cover was uploaded through the real web picker (`--upload` plants the bytes before the click, so the actual change-handler → repository → multipart path ran), and the landing then requested it as **`bearer GET /v1/media/019fe041-…/thumb`** — authenticated, and the **thumbnail variant**, not the original. **Zero anonymous `/v1` requests**, and the backend logged **zero** `Security rejection` / `UNAUTHENTICATED` lines in the window. That is the S3.3 trap's tell watched directly rather than inferred from a green test.

  The same cover renders on the **emulator** card, which matters because the two platforms take different `mediaSource` forks — web resolves an object URL, native downloads to `file://`, and only a device exercises the second. Coverless trips show the placeholder tile at the same 76px geometry on both rungs, and the card grid matches the mock frame: thumbnail, title, status slot, no destinations line. Card taps still open the day builder for a draft (decision 3c — unchanged this story).

  *Not exercised:* the **publication badge**, which needs a published trip and the pool's second account; it is pinned by unit tests across all three publication shapes, and publish behaviour is untouched by this story (spec AC 9).

- *2026-08-08, the walk above was insufficient and the founder found what it missed.* **Covers did not appear on the landing or the overview at all until a reload** — the create form uploads through the repository rather than `useUploadCover`, so nothing invalidated the cache after the upload landed, and the list had already refetched with `coverImageUrl: null`. **Why the walk missed it:** every `drive-preview.js` run begins with a cold page load, which refetches everything and hides the defect by construction. Worse, the overview screenshot captured during that walk *shows the placeholder on a trip that had a cover* — the evidence was collected and never opened, which is regression-checklist line 12 exactly. Fixed and re-walked **live-session** on both rungs (no reload): the picked photo now renders immediately on the overview while the upload runs, and the real thumbnail is on the landing card when back lands there. Regression lines 20 and 21 added.
