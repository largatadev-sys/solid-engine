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

*(none yet)*
