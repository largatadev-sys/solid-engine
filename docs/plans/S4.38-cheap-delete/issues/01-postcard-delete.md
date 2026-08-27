# 01 — Postcard delete, end to end (the pattern kit)

**What to build:** a traveler on their Profile's Diary tab taps the kebab on a postcard, gets the house bottom sheet (Edit postcard · **Delete postcard**), taps Delete, and the postcard collapses out of the list while a 5-second undo toast with a draining progress line offers Undo. Undo restores the row in place with no network call ever made; letting the toast expire sends exactly one entry DELETE. Deleting the last postcard in a diary collapses the diary card behind it; undo restores both. One overlay at a time the whole way: sheet → collapse → toast.

This slice builds the kit every later slice reuses, proven on one complete flow: the house toast widened to carry a trailing action (divider, 44px Undo target, 2px linear drain over the window, the paint-then-drain double-frame from the handoff), the undo state machine (deferred-commit for irreversible acts, monotonic token so a newer toast commits and replaces an older one), the row collapse/restore animation, and sheet-menu composition per subject kind. Design baseline: `../design/` (read the prototype's markup); semantics: `../ui-spec.md`.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Kebab → sheet → Delete postcard → collapse → undo toast, one overlay at a time; motion per the handoff's M5/M7/M8 constants; Reduce Motion drops rises/collapses/staggers, keeps scrim fades.
- [ ] Undo restores the row in place and **no DELETE reaches the wire** (Playwright asserts by request interception); toast expiry sends exactly one DELETE and the entry's photos leave the feed with it.
- [ ] Last-postcard delete collapses the diary card (derived from its entries, not tracked); undo restores both.
- [ ] Toast supersession: a second removal inside the window commits the first, then replaces the toast (pure-module Jest + Playwright).
- [ ] All copy (menu labels, toast messages) from a shared copy module both screens and specs import.
- [ ] The pure modules (undo state machine, menu composition) carry Jest suites; full `npx jest` before any push that adds a `src/` file; `npx playwright test --list` parses after adding specs.
