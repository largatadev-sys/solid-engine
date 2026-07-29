# 06 — Story gate

**What to build:** nothing new — the proof that S1.3 holds where it ships, and the bookkeeping that lets the merge land truthfully. (The S1.1/S1.2 gate pattern.)

1. **Local full-stack verification (standing rule):** `docker compose up` (fresh DB) · the two-account collaborative loop — A creates a 5-day plan, B (invited via S1.2) retitles a day, edits an activity, adds one, reorders — A sees all of it with B's attribution after refresh. Dev build on the emulator (nothing release-signed differs in this story — the "which build proves what" table).
2. **Preview container parity:** the same loop driven in the web-preview container (built per the CLAUDE.md recipe, never `expo export` + static server), `drive-preview.js` for evidence.
3. **Full suites green** — backend `mvn verify` (guard suites S0.3/S1.1/S1.2 **unmodified**), mobile Jest, typecheck.
4. **`/code-review` both axes**; findings fixed or recorded in the spec's `## Comments`.
5. **Bookkeeping in the last feature-branch commit:** BUILD_STATUS S1.3 row → ✅ (status + spec link, nothing else).
6. **Propose the squash-merge** `feature/S1.3-days-and-activities → dev` — propose-first, owner approves.
7. **Post-merge, closes the gate (spec AC 11):** the collaborative loop on deployed `dev`, founder-visible. Any SQL check names the environment *and* the database (`railway` — the S1.1 lesson); state each probe's failure mode before trusting it (the three-times-burned rule).

**Blocked by:** 01, 02, 03, 04, 05.

**Status:** done (2026-07-24) — squash-merged to `dev` (`3e1102d`), pushed, deployed, and verified on the deployed rung. One honest limitation on the member-*writes* half of AC 11 on deployed dev, recorded in the closing comment.

- [x] Local two-account loop with attribution — the owner-half fully on the local stack + emulator + web; the member-*writes* half proven locally against a directly-admitted membership (the S1.2 fixture), because a scripted account cannot verify its email to accept an invite (see closing comment)
- [x] Preview-container parity — built the true way, `drive-preview.js` clean (page text, Google iframe, zero console/page errors); S1.3 screens driven incl. the `.web` date-picker fork and a browser-created trip; the web-only dead-click and delete-confirm bugs found and fixed here
- [x] All suites green; guard ACs unmodified (spec AC 6) — backend 170, mobile 433; `git diff --diff-filter=M` shows zero modified S0.3/S1.1/S1.2 suites
- [x] `/code-review` — per-ticket (all five) **and** whole-branch, both axes; the whole-branch pass found 3 blocking cross-ticket bugs, all fixed (`c1f0ebd`)
- [x] BUILD_STATUS → ✅ in the last branch commit (`7d5567e`)
- [x] Squash-merge proposed and owner-approved → merged + pushed (`3e1102d`)
- [x] Post-merge on deployed `dev` — the full S1.3 flow verified live (see closing comment for the discriminating deploy check and the member-writes gap)

## Comments

**2026-07-24 — a three-rung smoke test ran ahead of the gate, at the founder's prompting. Four bugs found; all four fixed. What it closed and what it did not:**

**Already evidenced (do not re-derive at the gate):**
- **The stack builds and runs.** `docker compose up --build` clean; **V7 applied against a real Postgres 18** for the first time (only Testcontainers had run it before) — all seven migrations green, the contiguity UNIQUE, ordinal CHECK and cascade FKs all present. *(Host port 5432 was occupied by a local Postgres; the compose `POSTGRES_PORT` override handles it.)*
- **The API works end-to-end**, driven over HTTP with real `largata-dev` tokens: create-with-duration → days embed → rename → 3 activities → reorder → stale-reorder 400 → cross-day move → field edit → backwards-dates 400 → day delete with cascade + renumber → stranger 404 on GET/PATCH/day-append. Verified **at the database**, not just the responses: correct ordinals, zero orphans, 1 itinerary = 1 workspace = 1 owner membership. Zero ERROR log lines, and a **P3 check found no user-written text in the logs**.
- **The emulator dev build compiles, installs and runs** — which is also the only proof that ticket 04's `@react-native-community/datetimepicker` native module links. Journey walked with screenshots: sign-in → four-tab shell → greyed-tab message → create form (cover tile, description, duration) → **native Material date picker** (correct ISO, no timezone day-shift) → detail with "Daily schedule · N days" → day tabs, add-day, day title, add-activity, delete, greyed Preview CTA.
- **The web preview container is proven at the true build path** (`Dockerfile.web-preview`, `npm ci` + export inside the image, Caddy) on the pinned port 8081: `drive-preview.js` reports page text present, Google iframe rendered, zero console/page errors. Signed in and walked the S1.3 screens: nav, cover tile, description, duration, and **`input[type=date]` × 2 — the `.web` DatePicker fork**, a different code path from the native one. A trip was created from the browser and its date landed in Postgres.

**The four bugs, all fixed and re-verified — none of which any test could see:**
1. **A freshly created trip rendered "No days yet"** despite the server seeding them (create response omitted the plan; the client seeds its cache from it). Fixed backend-side + regression test. `a62964e`
2. **Day-tab chips rendered as full-screen-height bars** (horizontal ScrollView nested in a vertical one). `a62964e`
3. **Every greyed control was a dead click on the web** — `Alert.alert` is a no-op on react-native-web. Platform-forked; verified in the container. `cc7d65f`
4. *(Not a bug, checked before reporting: a "dead" Discover tab on the device turned out to be a tap landing on the dev-warning toast.)*

**Still to do at the gate:**
- **Activity CRUD, reorder and cross-day move through the UI** on both rungs — these were proven over the API, not by tapping. This is the largest remaining gap.
- The **two-account collaborative loop** (A creates, B edits, attribution visible) on a fresh stack — the AC 11 shape.
- Full suites, `/code-review` of the whole branch, BUILD_STATUS → ✅, **propose the squash-merge**, and the **post-merge deployed-`dev` check**.

**The rule this produced (now standing):** a smoke test is not done until it has run on **all three rungs** — API, emulator, web preview. Green tests plus an API drive hid three real bugs; "renders on web" is not "works on web".

**2026-07-24 (later) — the gate closed. Merged, deployed, verified live.**

**The whole-branch `/code-review` was worth holding the merge for.** Reviewing the 13 commits as one change (not per-ticket) found **three blocking bugs** per-ticket reviews structurally could not see — two of them *repeats of classes the branch had already fixed elsewhere*: (1) the two destructive delete confirms still used `Alert.alert` (a no-op on web) after `comingSoon` was forked for exactly that reason — so **delete was a silent dead click in the browser**, verified fixed end-to-end in the preview container (the confirm fires, the day deletes); (2) user-reachable plan caps threw `IllegalArgumentException` → 500 while ticket 03 had already established `ValidationException` → 400 for the same situation (new `PlanLimitExceededException`); (3) `days.tsx` swallowed all seven mutation errors while the other three screens surface theirs. All fixed in `c1f0ebd`. The meta-lesson recorded: *a javadoc asserting a rule is not the rule holding* — grep for each stated rule's siblings at the gate.

**The merge:** squash `feature/S1.3-days-and-activities` → `dev`, one commit `3e1102d`, owner-approved and pushed. `dev` compiled + typechecked post-squash (the cherry-pick-dependency footgun checked, not assumed).

**The deployed-dev check, with the discriminating-probe discipline the S1.1 lesson demands.** A healthcheck 200 does not distinguish new build from old — the trap this repo has hit three times. The discriminating probe: **create a trip with `durationDays` and read the response's `days` array** (a field the old build cannot produce). First probe after push returned `days` absent → *old build still serving* (deploy not yet finished); the poll then flipped to `days=3` → **new build live, which also proves V7 applied on the deployed database** (the days could not seed otherwise). Then the full flow on deployed dev: create-with-duration, day rename, activity create, **reorder** (order confirmed reversed), **field edit** with attribution stamped, dates, and **`costAmount` as a wire string** (the money-through-float fix holding on the real rung). A non-member is masked **404** before joining.

**The one honest limitation.** The member-*writes* half of AC 11 (B, a real second member, editing and A seeing it with B's attribution) could **not** be completed on *deployed* dev: accepting an invite requires a **verified** email (the S1.2 rule), and a scripted `signUp` account is unverified — there is no way to click a verification link from a shell. What is proven on deployed dev is the owner-half of the loop plus the guard **masking** a non-member (404). The member-*writes* path is proven on the **local stack** against a directly-inserted `MEMBER` row (`ItineraryFieldEditIT`, `DayContractIT`, `ActivityContractIT` all admit a real member and assert their writes + attribution). So the capability is proven; only its exercise *through the deployed invite flow by a verified second human* is not — that needs a real invited founder, which is the natural next real-use event, not a scriptable gate step.

**Probe artifacts left on deployed dev, knowingly** (the S1.1 precedent): a handful of `s13-*@largata.test` accounts and their trips ("S1.3 deploy probe/poll/gate…"). They cost nothing — dev is the reseed-at-will preview — and vanish at the next reseed. Recorded so the counts are not a mystery later.

**S1.3 is done.**
