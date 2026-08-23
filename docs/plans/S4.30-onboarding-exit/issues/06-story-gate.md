# 06 — Story gate

**What to build:** the evidence that an invited stranger reaches the trip, and that nobody is held at the front door.

**Blocked by:** 04, 05.

**Status:** ready-for-agent

- [ ] An end-to-end walk: a traveler with no completed onboarding opens an invite link, signs in, and reaches the postcard — with no onboarding step in between.
- [ ] The same walk continued: leaving the postcard offers onboarding, and "Skip for now" lands them home and is never asked again.
- [ ] A device or preview check for ticket 01, which no suite can reach: sign in as `t1`, sign out, sign in as `t2`, confirm `t2` is routed on `t2`'s profile.
- [ ] Sabotage-check the gate's new ordering. It is a table of conditions where a wrong answer still returns a plausible route — the shape that passes a test written from the same wrong table. Break the pending-join branch and confirm the walk goes red.
- [ ] BUILD_STATUS row updated in the last commit on the branch, before the merge.
- [ ] The two decisions the spec left to the owner (D1 handle, D2 resume line) are recorded as they shipped, including D1's reversal.
