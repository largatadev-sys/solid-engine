# `mobile/scripts` — the verification harness

Node scripts that drive the running product: the API rung over HTTP, and the web preview container
through real headless Chrome over the DevTools protocol. They are not tests — Jest and Failsafe own
the assertions. These prove behaviour on a rung that a test cannot reach.

## Before anything: source `mobile/.env`

Every script here reads its credentials from the environment. `mobile/.env` is gitignored (it holds
`LARGATA_TEST_POOL_PASSWORD`, a credential, and `LARGATA_TEST_POOL_EMAIL_BASE`, PII), so it must be
exported into the shell first:

```bash
cd mobile && set -a && . ./.env && set +a
```

Common env vars, supplied by that file unless stated:

| Var | Meaning |
|---|---|
| `EXPO_PUBLIC_FIREBASE_API_KEY` | the `largata-dev` web API key; every script signs pool accounts in through Identity Toolkit with it |
| `LARGATA_TEST_POOL_EMAIL_BASE` | the pool's base Gmail address; tags become `base+t1@…` |
| `LARGATA_TEST_POOL_PASSWORD` | the shared password for every pool account |
| `LARGATA_API_BASE_URL` | which rung to talk to. Default `http://localhost:8080`; `https://api-dev.largata.com` for deployed dev |
| `LARGATA_PREVIEW_URL` | the web preview container. Default `http://localhost:8081` |
| `LARGATA_CDP_PORT` | override a driver's Chrome DevTools port (each already owns a distinct one) |

Never put a value from `.env` on a command line — it lands in shell history and in the transcript of
whoever is watching.

Port map (pinned — see CLAUDE.md): **8080** backend · **8081** preview container · **8082** Metro.

## Test identities

Pool tags are roles, not people. `test-pool.js` owns `t1`–`t5` (verified) and `u1` (deliberately
never verified — the `EMAIL_NOT_VERIFIED` fixture). The accounts carry no display name on purpose, so
they render as `largata.dev+t1` and identify themselves on sight in a screenshot, a roster row or a
log line. Each script's tag→role mapping is stated in its section below.

## Which scripts can hit a deployed rung

Every script that talks to the API picks `http` or `https` from `LARGATA_API_BASE_URL`, so all of them
reach a deployed rung. The `drive-*` scripts additionally need a preview container, which is local.

## Chrome DevTools ports

Each driver owns a distinct port, so two can run at once. Override with `LARGATA_CDP_PORT`.

| Script | Port |
|---|---|
| `drive-preview.js` | 9223 |
| `drive-archive.js` | 9224 |
| `drive-ownership-transfer.js` | 9225 |
| `drive-lifecycle.js` | 9226 |
| `drive-edit-lock.js` | 9227 |

*(9228 was `drive-publish.js`'s and is free — see the retirement note at the end of this file.)*

Chrome is located by probing the usual Windows/Linux/macOS install paths. Only `drive-edit-lock.js`
takes an override (`LARGATA_CHROME`).

---

## `test-pool.js` — manage the verified test-account pool

Creates and reports the pool of genuinely verifiable Firebase accounts (one real Gmail inbox, `+tag`
sub-addresses). Verification is a one-time human click per account; the accounts live in the
`largata-dev` Firebase project, so they survive every fresh-DB redeploy.

```bash
cd mobile && set -a && . ./.env && set +a
node scripts/test-pool.js list        # every member and its verification state
node scripts/test-pool.js create      # create any missing member + send its verification mail
node scripts/test-pool.js token t1    # print a fresh id token for one member (for API probes)
```

Env: `EXPO_PUBLIC_FIREBASE_API_KEY`, `LARGATA_TEST_POOL_EMAIL_BASE`, `LARGATA_TEST_POOL_PASSWORD`.

Tags: `t1`–`t5` must all end up **VERIFIED** (open the base inbox and click each link after `create`).
`u1` must stay **unverified** — `create` deliberately sends it no mail. If it is ever verified by
accident, delete the account in the Firebase console and re-create it.

## `seed-trip.js` — seed a trip through the real invite → inbox → accept flow

Creates an itinerary, invites each member by email, reads the invitation out of their inbox and
accepts it over HTTP — no planted `membership` rows. Prints the trip id, the roster, the web-preview
URL and the `largata://` deep link as JSON.

```bash
cd mobile && set -a && . ./.env && set +a
node scripts/seed-trip.js                                   # owner t1, one member t2
node scripts/seed-trip.js --owner t1 --members t2,t3
node scripts/seed-trip.js --owner t1 --members t2 --title "Archive smoke"
```

Env: the three pool vars, plus `LARGATA_API_BASE_URL` (**local `http` rung only**).
Tags: whatever you pass — `--owner` is the trip owner, `--members` join as ordinary members.
Fails loudly if an account is not verified, naming `test-pool.js create` as the fix.

## `fetch-fixtures.js` + `seed-australia.js` — one real trip, with photos of the actual places

`seed-demo.js` below builds trips with **no images at all**, and `fixtures/photo.jpg` is a solid
orange rectangle — which is why every screenshot in this repo's history shows one. This pair exists
for the other job: a trip that looks like a trip, so a screenshot is worth reading.

**Two steps, because the photos are not ours.** `fetch-fixtures.js` pulls one landscape photo per
activity from Unsplash, keyed by a `photoQuery` in `fixtures/australia-trip.js`, and writes
`fixtures/australia/CREDITS.json` recording the photographer, the source URL and the licence for
each file. The images are **gitignored** — megabytes of third-party content, and the fetch is
reproducible. `seed-australia.js` then builds the trip and attaches them.

```bash
cd mobile && set -a && . ./.env && set +a
node scripts/fetch-fixtures.js          # once; skips anything already downloaded
node scripts/seed-australia.js          # local stack
```

What it creates: **Sydney & the South Coast**, five days, 14 activities at real named places with
times, AUD costs, notes and one booking; a cover photo; **t2 invited through the real invite →
accept**; the trip walked `draft → upcoming → ongoing` (so it reads as being lived, which is what
the Home feed wants); six photos in the Photo Dump contributed **by t2**; and four diary postcards
with written captions — public on posting, so the feed has real content immediately.

**It refuses rather than degrading, twice.** No `fixtures/australia/` → it stops, because seeding a
trip with no images is the exact thing it exists to avoid. A non-`localhost` API → it stops unless
you pass **`--yes-seed-the-deployed-rung`**, and the message says why: nothing this app exposes can
undo a trip, its photos, or its public postcards, on an environment other people read.

```bash
LARGATA_API_BASE_URL=https://api-dev.largata.com \
  node scripts/seed-australia.js --yes-seed-the-deployed-rung
```

Env: the three pool vars, plus **`UNSPLASH_ACCESS_KEY`** for the fetcher only (free, from
https://unsplash.com/oauth/applications — it lives in the gitignored `mobile/.env`).
Tags: `t1` = the author and trip owner, `t2` = the co-traveler who contributes to the dump.

**The trip content is written, not sourced.** Days, activities, places, times, costs, notes and
captions are composed in `fixtures/australia-trip.js` — plausible rather than verified, so do not
read a ferry price off it. Only the *photos* come from an API, matched by search term: broad places
(Bondi, the Three Sisters) return the real thing; a narrow one returns *a* café, not that café.

## `seed-demo.js` — a coherent set of trips to look at

Seeds four trips with real content — two published (one with a collaborator), one private with a
collaborator, one empty "someday" draft — so the Trips categories, the projection, Standouts, the
derived total and the roster all have something honest to render. Use it after wiping the local
stack; the DB has **no volume by design**, so `docker compose down && docker compose up -d` is the
wipe.

```bash
docker compose down && docker compose up -d          # from the repo root — fresh DB
cd mobile && set -a && . ./.env && set +a
node scripts/seed-demo.js
```

Env: the three pool vars. Tags: `t1` = owner of everything, `t2` = the collaborator on two of them,
`t3` = a stranger who joins nothing (so the masking cases stay testable). **Refuses to run against
anything but `localhost`** — it is fixture data, and there is no undo on a deployed rung.

## `smoke-api.js` — the API rung's smoke suite

Walks everything shipped so far against a running backend: health, the 401/404 envelope, the plan
(S0.3/S1.3/S1.4), invitations and the `email_verified` gate (S1.2), departure and re-entry (S1.5),
and the archive loop (S1.9). Exits non-zero on the first failing rung of checks.

```bash
cd mobile && set -a && . ./.env && set +a && node scripts/smoke-api.js
```

Env: the three pool vars, plus `LARGATA_API_BASE_URL` (**local `http` rung only**).
Tags: `t1` = owner · `t2` = member (invited, removed, re-invited) · `t3` = an invited address only ·
`u1` = the unverified caller both halves of the gate are proven with.

## `smoke-lifecycle.js` — S1.7 draft → active → completed, against a running rung

Drives the whole lifecycle arc with real verified accounts and real tokens. Every step is a
discriminating check and throws on the first failure.

```bash
cd mobile && set -a && . ./.env && set +a
node scripts/smoke-lifecycle.js                                              # local stack
LARGATA_API_BASE_URL=https://api-dev.largata.com node scripts/smoke-lifecycle.js
```

Env: the three pool vars, plus `LARGATA_API_BASE_URL` (http **or** https).
Tags: `t1` = trip owner · `t2` = an ordinary member who may never touch the lifecycle ·
`t3` = an invited address only.

## `smoke-ownership-transfer.js` — S1.6 offer → accept → the owner's exit, against a running rung

Drives the ownership-transfer arc end to end. Prints, at the finish, the SQL for the one fact no
endpoint exposes (the `ownership_transfer` row) for an operator to confirm in the database — name the
database in that query: deployed dev is `postgres.railway.internal:5432/railway`.

```bash
cd mobile && set -a && . ./.env && set +a
node scripts/smoke-ownership-transfer.js                                     # local stack
LARGATA_API_BASE_URL=https://api-dev.largata.com node scripts/smoke-ownership-transfer.js
```

Env: the three pool vars, plus `LARGATA_API_BASE_URL` (http **or** https).
Tags: `t1` = original owner · `t2` = offeree / new owner · `t3` = a bystander who must see the
governance state but never be able to act on it.

## `drive-preview.js` — cold-load report on the web preview

Loads the preview in real headless Chrome as a signed-out visitor and reports what it finds: the page
text (empty means the white screen), whether Google's sign-in iframe rendered, whether a One Tap
overlay appeared, GIS network responses, and every console and page error. It **reports only** — it
asserts nothing and always exits 0, so never gate on its exit code.

```bash
cd mobile
node scripts/drive-preview.js                        # default http://localhost:8081/
node scripts/drive-preview.js http://localhost:8081/ --shot out.png
```

Env: none — it takes the URL as a positional argument and signs in to nothing.
Reading the output: **`Google-rendered iframes: 1` is the trustworthy signal** that the OAuth origin
is registered. A `400` on `/gsi/button` in the GIS network section is normal and means nothing.

## `drive-lifecycle.js` — S1.7 lifecycle, driven in the preview container

Seeds two trips of its own over the API (one with future dates, one whose dates are both in the past),
then drives the lifecycle controls in the browser with `window.confirm` intercepted — cancel and
confirm both, since `Alert.alert` is a no-op on react-native-web and a dialog that ignores "no" is
worse than none. Exits non-zero if any check fails.

```bash
cd mobile && set -a && . ./.env && set +a
node scripts/drive-lifecycle.js
```

Env: the three pool vars, `LARGATA_PREVIEW_URL` (default `http://localhost:8081`),
`LARGATA_API_BASE_URL` (default `http://localhost:8080`). Needs both the preview container and the
backend up. Tags: `t1` = trip owner · `t2` = ordinary member.

## `drive-ownership-transfer.js` — S1.6 offer/accept, driven in the preview container

Seeds its own trip over the API, then drives the two-account offer → accept flow in the browser with
`window.confirm` intercepted, cancel and confirm both. Exits non-zero if any check fails; prints the
trip id it leaves behind.

```bash
cd mobile && set -a && . ./.env && set +a
node scripts/drive-ownership-transfer.js
```

Env: the three pool vars, `LARGATA_PREVIEW_URL` (default `http://localhost:8081`),
`LARGATA_API_BASE_URL` (default `http://localhost:8080`). Needs both the preview container and the
backend up. Tags: `t1` = owner who makes the offer · `t2` = the offeree who accepts it.

## `drive-archive.js` — S1.9 archive/unarchive, driven in the preview container

Drives archive and unarchive on an **existing** trip: the confirm dialog (cancel and accept both), the
frozen trip screen, the frozen members screen, the My Trips / archived-trips split, and the thaw.
Optionally writes a screenshot. Exits non-zero if any check fails.

```bash
cd mobile && set -a && . ./.env && set +a
node scripts/seed-trip.js --owner t1 --members t2     # note the trip id it prints
TRIP_ID=<id> node scripts/drive-archive.js
TRIP_ID=<id> node scripts/drive-archive.js --shot out.png
```

Env: the three pool vars, **`TRIP_ID` (required)**, and `LARGATA_PREVIEW_URL`
(default `http://localhost:8081`). Tags: `t1` = the trip owner; the whole drive runs as the owner,
because the owner is the only viewer with archive controls to lose.

## `smoke-publish.js` — S4.1 publish, the whole ladder against a running rung

Builds its own fixture (a dated, two-day, priced trip with tips and standouts) and walks the story
end to end on the API: preview → publish → the consumer read → unpublish → republish → archive →
unarchive. It **pins the projection's field set exactly** and greps the serialized payload for every
field the absence rule forbids, so a leak fails here as well as in the ITs — the wire is the thing
travelers see, and it is worth asserting twice. Also checks the derived total's single-currency rule
in both directions and the ADR-008 additivity of the two new header fields. Exits non-zero on any
failure, and prints the trip id for the drivers below.

```bash
cd mobile && set -a && . ./.env && set +a
node scripts/smoke-publish.js
LARGATA_API_BASE_URL=https://api-dev.largata.com node scripts/smoke-publish.js
```

Env: the three pool vars + `LARGATA_API_BASE_URL`. Tags: **`t1` = owner (publishes), `t2` = member,
`t3` = non-member consumer** — the three-way split the story needs, since private/member/public are
three different audiences and two accounts cannot tell them apart.

## `deploy-currency.js` — is the rung running the build you think it is?

Answers one question with a **stated failure mode**, which `/v1/health` cannot: it creates a throwaway
trip, archives it, attempts a write, and reads the `TRIP_ARCHIVED` refusal *message* — a string that
changed at the E1 gate. Exit **0 = CURRENT**, **1 = STALE**, **2 = UNKNOWN** (never act on a 2).

```bash
cd mobile && set -a && . ./.env && set +a
node scripts/deploy-currency.js                                    # deployed dev by default
LARGATA_API_BASE_URL=http://localhost:8080 node scripts/deploy-currency.js
```

Env: the three pool vars, plus `LARGATA_API_BASE_URL` (default `https://api-dev.largata.com`) and
optional `LARGATA_POOL_TAG` (default `t1`). Leaves one archived probe trip behind per run.

**Why it exists, and what maintaining it means.** `{"status":"ok"}` is identical on every build ever
deployed, so it cannot distinguish one from another — the indistinguishable-probe shape this repo has
been burned by three times. This probe was **verified in both directions before being trusted**:
CURRENT against the local stack carrying the fix, STALE against deployed dev carrying the old build.
**Its discriminator is a message string, so it decays**: once preprod and prod also carry this build,
the old spelling is gone everywhere and the probe silently starts answering CURRENT for everyone. When
the next release needs a currency check, **re-point it at a string that changed in that release** and
re-prove both directions, exactly as this one was.

## `drive-edit-lock.js` — header-lease prober *(S1.4; rewritten at S4.9 for subject-typed leases)*

Signs a pool account in via Identity Toolkit, plants the session in `localStorage`, drives headless
Chrome to a trip's `/edit` route, types a title change, clicks Save, and intercepts `window.alert`
over CDP to prove the lock modal actually fires on web. **Saving is what acquires the header lease** —
S4.9's subject-typed leases removed acquire-on-entry, so a driver that only navigates proves nothing.

Env: the three pool vars plus **`TRIP_ID` (required)**, optional
`LARGATA_POOL_TAG` (default `t2`), optional `LARGATA_PREVIEW_URL` (default `http://localhost:8081`),
optional `LARGATA_CHROME`.

---

## Retired: `drive-create-flow.js`, `drive-workspace.js`, `drive-publish.js`

Deleted 2026-08-13 *(founder ruling, recorded in the epic map)*. All three had rotted against the
surfaces they test — `drive-create-flow` still hunted the **"Create Itinerary"** control S4.15 renamed
to *Plan a Trip* — and `smoke-all` had been ending in a `FAILED:` line on a healthy tree for four
stories, which teaches whoever reads it that the line is noise.

They were **retired rather than repaired** because the Playwright port would otherwise rewrite the
same three files twice. **What they covered is written down first**, at
`docs/design/web-walk-flow-inventory.md` — that inventory, not this code, is what the port works from.
Read it before rebuilding: the surviving green was almost entirely rendering and read-only surfaces,
while nearly every *act* (Finalize, Start Trip, Step back, Publish, Copy Link) had already gone dark,
so rebuilding only what passed would ship less coverage than these walks had when they were healthy.

The scripts remain in git history if the port wants to read them. CDP port **9228** is free again.
