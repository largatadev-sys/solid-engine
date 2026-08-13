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

## `fetch-fixtures.js` + `seed-travelers.js` — ten travelers, real places, real photos

`seed-demo.js` below builds four trips with **no images at all**, and `fixtures/photo.jpg` is a solid
orange rectangle — which is why every screenshot in this repo's history shows one. This pair exists
for the other job: a dataset that looks like the product in use, so a screenshot is worth reading and
the Home feed has ten different travelers on it.

**Ten accounts, one region each**, clean names and bird avatars: Maya Ocampo (Southeast Asia) ·
Kenji Nakamura (East Asia) · Sarah Whitmore (Oceania) · Ana Duarte (Western Europe) · Dimitri Stavros
(Mediterranean) · Lucia Fernández (South America) · Marcus Bell (North America & Iceland) · Amina
Diallo (Africa) · Rohan Mehta (South Asia) · Ingrid Solberg (Northern Europe). **50 trips, 115 days,
186 activities, 92 diary postcards**, spread across every lifecycle state so the Trips tab has
content in each section.

```bash
cd mobile && set -a && . ./.env && set +a
node scripts/test-pool.js create        # once — t6–t10 do not exist yet
node scripts/fetch-fixtures.js          # once — 131 searches, ~360 photos, several minutes
node scripts/seed-travelers.js          # local stack
node scripts/seed-travelers.js --tag=t2 # or just one traveler
```

**Verification is NOT needed for t6–t10.** Only *accepting an invitation* gates on `email_verified`
(`EMAIL_NOT_VERIFIED`, `InvitationService`), and each traveler seeds their own trips solo. `t2` is the
one account that accepts invitations — it collaborates on the long trips it does not own, which is
what gives the Photo Dump a member-contributed pile. So `create` is enough; nobody clicks a link.

**Where each piece of content comes from, because they are not the same:**

| Field | Source | True? |
|---|---|---|
| Trip title, days, activity titles, times, costs, notes, postcard captions | **Composed** in `fixtures/travelers.js` | Plausible, **not verified** — do not read a ferry price off it |
| Activity `place` | Composed — real named places, coherent routes | Real place names |
| The photo | **Pexels**, searched by the *day's* location, three per response | Genuinely of that place for famous spots; a fitting lookalike for obscure ones |
| Activity `description` | The photo's own **`alt`** text, verbatim | Literally true of the image you are looking at |

That last row is the useful trick: Pexels returns **no location field**, only `alt` — so the *place*
comes from the search term and the *description* comes from the photo. It is the one string in the
dataset that describes the actual pixels rather than being invented.

**Attribution.** `fixtures/photos/CREDITS.json` records the photographer, their profile, the source
page and the licence for every file. The images themselves are **gitignored** — megabytes this repo
does not own, and the fetch is reproducible. The Pexels licence permits this use and asks for a
visible link to Pexels plus photographer credit where possible.

**It refuses rather than degrading, twice.** No `fixtures/photos/` → it stops, because seeding trips
with blank images is the thing it exists to avoid. A non-`localhost` API → it stops unless you pass
**`--yes-seed-the-deployed-rung`**, because nothing this app exposes can undo a trip, its photos or
its public postcards on an environment other people read.

```bash
LARGATA_API_BASE_URL=https://api-dev.largata.com \
  node scripts/seed-travelers.js --yes-seed-the-deployed-rung
```

Env: the three pool vars, plus **`PEXELS_API_KEY`** for the fetcher only (free, from
https://www.pexels.com/api/new/ — 200 requests/hour, and a full fetch uses 82).

### `backdate-seed.js` — the history, and the one place this harness writes SQL

Freshly seeded postcards are all minutes old, so the feed reads as a fixture rather than an app in
use. Run this after the seeder and the 92 postcards spread across about six months:

```bash
node scripts/backdate-seed.js              # local
node scripts/backdate-seed.js --tag=t4     # one traveler
```

Weighted toward recent — 20% this week, 30% this month, 30% within three months, 20% out to six — so
the top of the feed is fresh. **Deterministic**: a trip's date derives from its own title, so
rebuilding puts it in the same week rather than reshuffling your history. **An ongoing trip always
posts within the last two days**, because a trip the app shows as in progress cannot have posted in
March. A trip's own postcards land on consecutive days, so it reads as several days of posting.

**Why SQL, and why this is not the psql ban.** S1.5 banned planting rows with psql because doing so
**skipped the verification gate** — the fixtures bypassed the rule the gate exists to enforce.
Nothing is bypassed here: auth, membership, the lifecycle ladder, photo ingest and the entry itself
all still go through the real API. Only *when it happened* is adjusted, and there is deliberately no
endpoint for that, because a real postcard is posted now. The clock is one app-wide
`Clock.systemUTC()` bean, so the alternative was a request-level override — test-only code in the
production path, a worse trade than one visible, opt-in script. It is kept **out** of the seeder so
the exception is a thing you run rather than a thing hidden inside something else.

Reaching a deployed rung needs `LARGATA_DATABASE_URL` (Railway → Postgres → Variables →
**`DATABASE_PUBLIC_URL`**; the internal `postgres.railway.internal` host only resolves inside
Railway's network) **and** `--yes-backdate-the-deployed-rung`.

### Growing it — the dataset is static, and that is what makes it safe to grow

There is no generator. Every trip is hand-written in `fixtures/travelers.js`, so the same run always
produces the same 50 trips. **Adding more is editing that one file** — there is no second set to
manage, because a re-run *archives the previous copies of every fixture-titled trip and rebuilds
them all*. Grow the file, re-run, and the dataset is bigger with no duplicates.

```bash
# 1. add trips to fixtures/travelers.js — see the shape of any existing one
# 2. fetch only what is new (existing files are skipped, so this is cheap)
node scripts/fetch-fixtures.js
# 3. rebuild that traveler, or everyone
node scripts/seed-travelers.js --tag=t4
node scripts/seed-travelers.js
```

**The rules the content follows** *(founder, 2026-08-13)*, so a new trip fits the ones already here:

- **The point is a feed that looks inhabited.** This is not coverage of the world — every country is
  not a goal and was explicitly ruled out as unrealistic. It is enough traffic that Home, Trips and a
  profile read like a social app in use rather than a test harness.
- **No two trips are the same trip.** Different itineraries, different activities, different
  captions. **The same region is fine** — two travelers in Japan, or one traveler back in Japan a
  second time, is exactly what a real feed looks like. Identical *content* is what to avoid.
- **One day is one place**, because the photo search is keyed on the day's location. A day that
  wanders across a region gets photos of whichever part the search picked.
- **Trips spread across lifecycle states.** A dataset of nothing but `completed` leaves the Trips
  tab's Ongoing, Upcoming and Drafts sections empty, and only started trips can carry postcards.
- **Photos are not rotated per run** *(founder, 2026-08-13)* — a place keeps the photos it was first
  given, so the same trip looks the same every time you rebuild it. Variety comes from new trips,
  never from reshuffling old ones.

Only a **new** day location costs a Pexels search; everything already in `fixtures/photos/` is
skipped. At 25,000 requests a month, the budget is not a constraint on how far this grows.

**This dataset breaks the self-identifying-fixture rule on purpose** *(founder, 2026-08-13)*. The
2026-07-27 ruling says a test identity must identify itself, which is why `precomplete-profile`
deliberately sets no display name and the pool renders as `largata.dev+t1`. Here the founder asked
for clean names so the feed reads like a product rather than a test harness — so `seed-travelers.js`
PATCHes a real name and handle over that. The tag is still in the email address and the seeder prints
`name (tag, @handle)` on every line, so a screenshot can still be traced back to an account.

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
