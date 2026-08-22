# 04 — The Travelers tab foundation: sections, rows, avatars, cascade

**What to build:** the tab's read surface to frames 1/3/1b — the sectioned roster with photo avatars, the two shared primitives the rest of the story stands on (the per-member tint map and the app-drawn bottom-sheet), and the entrance cascade. No mutations yet (no ⋯, no add bar — those arrive with their actions in 05/06, so nothing ships as a dead click).

**Blocked by:** 01 (published-variant rendering keys off the freeze being real) · 03 (the Invited rows' "Invited by @handle" sub reads the enriched pending list).

**Status:** ready-for-agent

- [ ] The **tint map** as a shared module: the canvas's eight well/ink pairs, assigned deterministically by traveler id (same traveler, same tint, every surface — Chat inherits this module at S4.10's successor work). It paints **initials fallbacks only**; photos are always primary, here, in facepiles, and in the sheet.
- [ ] The **bottom-sheet primitive**: grabber, title slot, scrim fade 150ms in / sheet rise 200ms ease-out / dismiss reversing at 150ms (M4) — built once, consumed later by the add sheet and every ⋯ menu.
- [ ] Sections in fixed order with live counts: **Travelers · N** (owner first, then join date) · **Invited · N** (only when non-empty; rows at 0.55 with "Invited by @handle — waiting on them") · **Requests · N** (owner only, only when non-empty, always last; "Via invite link · Nh ago"). Headers 11/700 uppercase muted.
- [ ] Member rows to the canvas: 40px photo avatar, handle 14/600, sub 12 ("Trip owner" / "Joined Feb 12"), the viewer's row appending " · You", the **"Ownership offered · waiting on them"** accent sub rendering from the existing wire flag.
- [ ] The **email-legacy invited row**: neutral envelope avatar, title "Email invitation", sub "Invited by email — waiting on them" — **no address renders anywhere** (assert it).
- [ ] **The avatar is the row's only tap target** (≥44px hit): opens the existing read-only profile dialog; the rest of the row is inert.
- [ ] The **published variant** (frame 1b rendering): Invited and Requests hidden, roster only. The **archived variant**: read-only roster.
- [ ] **M6 cascade**: headers + rows fade/rise in a 30ms top-to-bottom stagger, capped at ten rows, **once per tab visit** — never on re-render, scroll, or sheet return. **M5 press feedback** on every tappable. **Reduce Motion** jump-cuts entrances.
- [ ] Old read-only Travelers tab content fully replaced; the trip screen's tab wiring unchanged.
- [ ] Jest at pure seams: section assembly (roster + pending + requests → sections, counts, order) · tint determinism · the once-per-visit cascade guard · the sub-line chooser (owner / joined / offered / invited / email-legacy).
