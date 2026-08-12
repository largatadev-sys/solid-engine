# 03 — Share affordances in the diary

**What to build:** A traveler flips a postcard public from the app, both at the moment of posting and after the fact. The composer gains a "Share to feed" toggle, default OFF; posting with it on shares the new entry as part of the one flow the traveler experiences. The composer's pinned S3.1 info note — "Only you can see your diary. It shows up on your profile." — becomes state-aware: with the toggle on it must say the postcard goes public (final wording proposed at implementation, founder veto on sight — spec decision 6). Each entry in My Diary shows its shared state and carries share/unshare, so the feed can be seeded from existing diaries and mistakes pulled back. Everything through the repository layer; demoable against ticket 01's API before any feed screen exists.

**Blocked by:** 01 — The share on the wire.

**Status:** ready-for-agent

- [ ] A postcard posted with the toggle on is immediately visible in a second pool traveler's feed read (API-verified until ticket 04's screen exists); with the toggle off it stays author-only.
- [ ] An existing entry retro-shares from My Diary and unshares again, the state visible on the entry both ways.
- [ ] The info note reads the S3.1 copy with the toggle off and the public wording with it on — the copy pinned by test, the S3.1 AC-11 precedent.
- [ ] The web driver walks post-with-share and retro-share/unshare through the real affordances (the S4.18 rule), watching the API-request list for the share acts.
