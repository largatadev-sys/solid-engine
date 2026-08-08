# 03 — Trips landing chrome & copy

**What to build:** The landing speaks Trip and wears the mock's chrome. The bottom CTA reads **"Plan a Trip"** with the mock's plus-circle icon and opens the form directly. Section labels go plural — **Ongoing Trips · Upcoming Trips · Drafts · Completed Trips** — with order, empty-section hiding, and lifecycle-only membership unchanged (spec decision 4). The header gains the mock's **search** and **filter** icons, greyed to the coming-soon dialog on both platforms (the established shell pattern). The Trips tab icon becomes the mock's **briefcase** (icon-fidelity rule). The **archived-trips link** and the **"Add a Past Trip"** button are removed — archive semantics and routes stay; the past-trip door is scrapped `wontfix` (spec decision 6). Header and label styling per the mock, normalized to Inter and the theme tokens (spec decision 9).

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [x] The CTA reads "Plan a Trip" with the plus-circle icon and opens the form (spec AC 1).
- [x] The four plural section labels render per spec decision 4; empty sections hidden; membership derived from lifecycle state alone (spec AC 5).
- [x] Search and filter icons render in the header and fire the coming-soon dialog on native **and** web (spec AC 7).
- [x] The Trips tab shows the briefcase icon.
- [x] No archived-trips link and no "Add a Past Trip" button anywhere on the landing (spec AC 7).
- [ ] CTA and section-label strings pinned by unit tests; emulator + web preview confirm no dead clicks.

## Comments

- *2026-08-08, implementation:* code complete, typecheck clean, full mobile suite green (1933 tests). The unticked box is compound — its **unit-test half is done** (`tripSections.test.ts` pins the four plural labels, `tabRouting.test.ts` the CTA and both greyed header icons); the **walk half** (spec AC 8: emulator + web preview confirming no dead clicks) needs the local rig and has not been run, so the box stays open rather than being claimed.
