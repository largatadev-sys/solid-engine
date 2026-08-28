# 02 — Tracer bullet: bubble → sheet → report → thank-you

**What to build:** the first complete path through every layer. The feedback store (one
platform-split module on the discovery recents-store pattern, holding the visibility
tri-state and the dock position) and the fail-closed visibility function (spec decision 2).
A minimal FeedbackDock mounted once in the root layout at the default slot — right rail,
bottom reserve 96 — no drag yet: tap mints the draft and opens the sheet, press feedback via
the shipped hook, accessibility per spec decision 12. The FeedbackSheet composed on ticket
01's seam: type toggle defaulting to Problem, description with the 1,800/2,000 counter rule,
Send inert until a character, the sending state, the terminal thank-you.

**Blocked by:** 01.

**Status:** done

- [ ] Visibility function has a Jest case per lane (localhost, emulator alias, deployed dev, a prod-shaped URL, absent) × each tri-state value; `'hidden'` beats the dev default and `'revealed'` beats a non-dev lane
- [ ] The base URL is read only through the API client's exported accessor — no new `process.env` access anywhere (the inlining rule)
- [ ] Store round-trips both fields on both platform forks; an absent or corrupt store yields `'default'` and the default position without throwing
- [ ] The dock renders over signed-in and signed-out screens from one mount; role button, label "Send feedback", last in the reading order, 44 hit target
- [ ] Tapping the dock captures the screen the tap came from (draft minted at open, provably not at submit)
- [ ] A report filed from the preview against the local stack lands in the backend log via the logging relay; the thank-you renders its copy verbatim; Done returns to an untouched screen
- [ ] Re-submitting after a failure reuses the same reportId (draft released only on success or explicit discard)
