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

**Status:** ready-for-agent — **partially pre-closed by the 2026-07-24 three-rung smoke test** (see the Comments below for exactly what is already evidenced and what remains).

- [ ] Local two-account loop complete with attribution visible (spec AC 11 shape, local rehearsal)
- [ ] Preview-container loop complete, clean console
- [ ] All suites green; guard ACs unmodified (spec AC 6)
- [ ] `/code-review` clean or dispositioned in spec Comments
- [ ] BUILD_STATUS → ✅ in the last branch commit
- [ ] Squash-merge proposed and owner-approved
- [ ] Post-merge loop on deployed `dev` — the gate's closing evidence

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
