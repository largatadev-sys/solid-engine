# 02 — The two tabs go live

**What to build:** the Itineraries tab lists the subject's published showcase and the Diary tab shows their shared postcards grouped by trip — a stranger browsing what a traveler has made public, with nothing private visible.

**Blocked by:** 01.

**Status:** ready-for-agent

- [ ] The by-handle showcase read filters by the S4.3 public predicate (published + public + non-archived) — **never the owner's list.** The IT establishes presence before absence: a published trip appears, then a private trip and an archived trip planted for the same subject are proven absent. An absence with no established presence proves nothing.
- [ ] The by-handle diary read mirrors the own Diary tab's trip-grouped anatomy; only trips with shared postcards contribute section headers (trip-title exposure is precedented — the public feed already ships it).
- [ ] Both reads paginate by cursor; the client hands `nextCursor` straight to the query layer (the null-cursor gotcha family — no `!== undefined` comparison anywhere).
- [ ] The tabs render the reads with the S4.21 tab anatomy; the empty states from ticket 01 remain for a subject with no content in one tab but content in the other.
- [ ] Viewing is read-only: no edit, delete, or share affordance from the own-profile forks leaks into the public projection.

## Comments

**2026-08-25 — the design baseline is now the S4.36 canvas**, frame **1a**: trip-section and postcard-card anatomy per the digest, tab and expand motion per **M2** (Reduce Motion per M5, normative). **One named deviation from the frame: the postcard's likes row ("♥ 31 likes") does not ship** — no real count exists and the spec's decision 6 forbids stub numbers in front of strangers; it returns with S4.4/S4.6. Empty tab states per 1b, the Itineraries empty mirroring the Diary one (C7).

**2026-08-26 — two more deviations from frame 1a, declared rather than passed as choices** *(the mock rule: deviate only where the platform forces it, and say so)*:

- **The itinerary row reads `"{destination} · {days} days · Published"`, not the frame's `"{days} days · {n} activities · Published"`.** No activity count exists on `ShowcaseItineraryResponse`, and widening a shipped response to carry one is a change this ticket does not own. The destination takes the slot because it is the fact the row already has and the one a stranger browsing a showcase is choosing between. **Trigger to revisit:** whenever the showcase response next changes for another reason.
- **Both tabs page with a "Show more" pressable; the frame draws no pagination control.** This is the own-profile tabs' shipped affordance, inherited with the anatomy, and the reads it drives are genuinely cursor-paginated. C6's prefetch-at-5-rows is specified for the *people results* screen and is built there; it is not specified for the profile tabs. **Trigger to revisit:** if the founder reads the control as clutter on the public page.
