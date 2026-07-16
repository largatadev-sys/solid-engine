# 06 — Story gate: the sideload proof, the tracker, propose the merge

**What to close the story with:** The mobile-train AC on real hardware: the **signed release APK** (ticket 05) with `https://api-dev.largata.com` baked in, installed on the **owner's physical phone** by sideload — no store, no account — running the S0.3 flow end-to-end against the deployed cloud backend. This is the moment both trains are proven: the artifact is release-grade, the backend is the deployed one, and the only unproven segment left in the whole system is the Play upload itself (parked, by design). Then the founders' round-trip on `preview.largata.com` confirmed by an actual founder. BUILD_STATUS row → ✅ + spec link **in the last commit on the feature branch** (CLAUDE.md: never after the merge). Then **propose** the squash-merge into `dev` and wait.

**Blocked by:** 01–05.

**Status:** open

**The checklist for the human:**
1. Install the release APK on your phone (file transfer → tap → allow the source once)
2. Sign in (email or Google — this is the native build; both doorways exist here)
3. Create a trip → see it in My Trips without manual refresh → open it — all against `api-dev.largata.com`, phone on mobile data if you want the full "not my Wi-Fi, not my machine" proof
4. Send `preview.largata.com` to a founder: they sign up with email, create a trip, see it listed, open it
5. Optional cross-check that makes the demo land: the founder's trip and your phone's trip live in the same dev database — each account sees only its own (S0.3's isolation, now spanning a browser in one country and a phone in another)

- [ ] Device AC (human-observed): S0.3 flow on the owner's phone, release APK, deployed dev backend
- [ ] Founder AC (founder-observed): browser round-trip on `preview.largata.com`
- [ ] Full CI green: backend suite (on Postgres 18) + mobile Jest + typecheck + stack smoke
- [ ] BUILD_STATUS: S0.4 → ✅ with spec link, in the final feature-branch commit; nothing else in the row
- [ ] Anything raised mid-story is in the epic-map backlog, not in a TODO comment
- [ ] Squash-merge into `dev` **proposed** with the inter-change-dependency note for the future cherry-pick (CLAUDE.md footgun); merge waits for owner approval

## Comments
