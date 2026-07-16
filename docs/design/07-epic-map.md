# 07 · Epic Map — Largata  `[MVP-THIN — launch epics named; near-term stories detailed]`

**Architect's question:** *What is the whole territory, and what is the smallest slice of it that tests the idea?*

**The epic map is durable — the living backlog, not a design-time snapshot.** Anything raised over the life of the product — an improvement, an issue, a deferred idea, a new feature — has one home: the backlog here. Raising something *means* capturing it in this map; it waits as a placeholder and is elaborated into stories only when picked up. Created during design, **maintained forever after** — it does not stop being the backlog when the MVP ships.

_Status: **proposed — pending founder ratification.** Launch scope = Epics 0–6 (founder decision: the ledger is **in** launch — the hypothesis is "plan + costs + record"; costs stay). Stories are elaborated **just-in-time**: Epic 0's are agent-ready now; later epics carry story lists at slice level, elaborated when pulled. Only the next few stories are ever in flux — by design._

---

## Launch sequence & dependencies

```
E0 skeleton → E1 collaborative planning → E2 decisions → E3 the record → E4 social surface → E5 ledger → E6 unfurler
```

- **E0 is the walking skeleton = the MVP's spine:** one thin path through every layer, deployed to the prod target and installable via TestFlight/internal. It validates both release trains, the guard, and the pipeline while the cost of being wrong is one feature.
- **E6 last is deliberate:** items function as **bare links + manual fields from E1 onward** (the unfurler's own degradation mode is the baseline), so nothing upstream waits on it. Its real risk (bot-blocking/coverage) is de-risked by the **register #8 spike, run early and independently** — an afternoon script, no story dependency. If the spike surprises badly, ADR-007's buy-fallback absorbs it without moving the epic.
- **E5 (ledger) is in launch scope** — the biggest cuttable if runway tightens, but cut it and the hypothesis loses "costs."
- **The validation gate sits after E6 ships to alpha** — criteria per register #1 (COO, signed before alpha).

---

## Epic 0 — Walking Skeleton  *(stories agent-ready now)*

> **S0.1 — Repo, environments, and the standing rules**
> **Context anchor.** Epic 0 · no domain yet · establishes the patterns everything follows: Artifact 04 (deployment, containerization scope), 06a/06b.
> **Vertical slice.** Monorepo per the 04 layout decision (`backend/` + `mobile/` as root-level peers; docs and bridge files at root) · full-stack local Docker (Spring + Postgres + storage emulator) · Spring skeleton with `common` (logging filter, exception handler, error envelope) · Expo app skeleton with the repository/cache layer stub and one typed `apiClient` · CI (build + test) · `.gitignore` for all secret files **before the first commit** (the structural guarantee) + a staged-diff secret/PII scan before every commit (the soft backstop) · CLAUDE.md and BUILD_STATUS seeded · `GET /v1/health` returning through the whole stack.
> **ACs (=tests).** `docker compose up` yields a working stack from clean checkout · health endpoint returns 200 with the standard envelope conventions · a thrown `DomainException` produces the Artifact 05 error envelope with a traceId that appears in exactly one log line · CI red on test failure · a planted fake secret is blocked from commit.
> **Scope boundary.** No domain entities, no auth, no deployment to PaaS yet.

> **S0.2 — Auth end-to-end**
> **Context anchor.** Epic 0 · identity module · ADR-006, Artifact 03 (context propagation).
> **Opens with (carried from S0.1, 2026-07-15).** Install Android Studio + an AVD — the dev-build needs the toolchain regardless, so this is a prerequisite, not extra work. First act: close S0.1 ticket 05's two open device ACs (the health screen on a device, and its typed error state). This also tests the `10.0.2.2` host alias, the one assumption S0.1 could not reach. **Note:** Expo Go on the emulator may hit the same SDK 57 store lag that blocked both phones — if so, the dev-build closes those ACs instead, and is the better test anyway.
> **Vertical slice.** Firebase sign-in on mobile (Google + email; Apple sign-in activates with the iOS phase — ADR-010) → backend validates the JWT as OAuth2 resource server → first authenticated call provisions the domain `Traveler` (keyed by Firebase UID) → `GET /v1/me` returns it.
> **ACs.** Sign-in on the Android dev-build · request without token → 401 in the standard envelope · first `/me` call creates the Traveler exactly once (idempotent) · `userId` appears in request-scoped logs via the filter, never set by leaf code.
> **Scope boundary.** No profile editing, no account deletion (its own story later), no workspace anything.

> **S0.3 — Create and view an Itinerary (the first domain slice, guard included)**
> **Context anchor.** Epic 0 · itinerary module · Artifact 02 (Itinerary aggregate, `draft` state), Artifact 03 (the guard exists from the first domain endpoint — not retrofitted).
> **Vertical slice.** `POST /v1/itineraries` (title, destination, dates → `draft`) · `GET /v1/itineraries/{id}` · `GET /v1/itineraries` (mine, cursor-paginated) · mobile screens: create + list + view, reads through the repository/cache layer.
> **ACs.** Creator can create/list/view · **another authenticated user → 404 on my private itinerary** (the guard's first proof) · visitor (no token) → 401 · created itinerary is `draft` with `private` visibility · list uses the one pagination shape.
> **Scope boundary.** No items, no workspace, no publish, no fork. The guard resolves ownership only (membership arrives with E1).

> **S0.4 — Both release trains to production**
> **Context anchor.** Epic 0 · Artifact 04 (deployment & environments).
> **Vertical slice.** PaaS environments (dev/preprod/prod + managed Postgres) · branch→env promotion per CLAUDE.md · **local release build (Expo prebuild + Gradle, signed AAB — no EAS, ADR-010) uploaded to the Play internal testing track** pointed at preprod → Play store-ready config pointed at prod · env-var config surface proven (no secrets in repo).
> **ACs.** The S0.3 flow works on a phone via Play internal testing against the deployed backend · promotion dev→preprod→prod executed once end-to-end · prod `/v1/health` green.
> **Scope boundary.** No store *release* (internal track only until alpha) · no iOS anything (post-validation activation) · no observability beyond platform basics.

**Skeleton done = the playbook's exit criterion met:** auth → API → guard → domain → Postgres → response, running on the prod target, installable on a phone.

---

## Epics 1–6 — launch scope  *(story lists at slice level; elaborated agent-ready when pulled)*

**E1 · Collaborative planning** — the hypothesis's core.
Workspace forms around an itinerary (creator = owner, atomic; **backfills workspaces for pre-E1 itineraries** — S0.3 ships an ownership-resolved guard with the permanent signature, ADR-011) · email invite → accept → member (Invitation entity, single-use token, transactional email) · itinerary items CRUD **+ itinerary field edit (title/destinations/dates — homeless until S0.3's grilling found it)**, collaborative · **itinerary delete (owner-only; interacts with INV-4 and the workspace lifecycle — own story, added at S0.3)** · private comments · member removal + leave · ownership transfer + owner-deletion claim flow (INV-4) · workspace state machine (register #12 resolves at the invite story; #10 at the lifecycle story) · **the entitlement seam** — the `can(traveler, capability)` service, returning full access in v1 (the switch Epic 7 later wires to billing; ADR-009).

**E2 · Decisions** — Decision + Vote (one per member, INV-10) · close with outcome. *(No push notifications in launch — founder decision; voting is pull-based in alpha. Invites are unaffected: they travel by email.)*

**E3 · The record** — Diary create + contributor grants (INV-2a) · entries: text, photos (object storage), geotag · media upload pipeline · offline read-cache proves itself here (ADR-001).

**E4 · Social surface** — publish itinerary with visibility (register #11 resolves at the publish story) · published diaries → Highlights (register #13) · discovery/browse feed (cursor) · stars · reviews (register #4) · public comments (register #5) · **fork** (plan-only copy + Fork Relationship, INV-6) · visitor read-only surface (INV-3).

**E5 · Ledger** *(Full-rigor zone)* — expense + splits (INV-7, transactional) · balances view · transfers: settle/waive/reassign (INV-8 append-only) · aggregate trip cost derived → shown on published itinerary (INV-2) · account-deletion anonymization completes here (it touches ledger survival).

**E6 · Unfurler** — *(preceded by the register #8 spike, run any time before this epic)* share-sheet capture (native extension, dev-build) + paste fallback (register #7 resolves here) · unfurler worker Tier 1+2, cached, async enrich · pending/failed item states in UI.

---

## Epic 7 — Subscriptions  *(post-validation, pre-beta — deliberately NOT launch scope)*

The business model: two tiers, **Free / Subscriber**; launch is entirely free. Positioned after the validation gate because the alpha must measure product pull, not willingness-to-pay — and TestFlight subscriptions are sandbox-only regardless (ADR-009). Slices: store products configured (App Store + Play) · RevenueCat-class SDK integration · purchase + restore flows · server-side receipt validation + webhooks → entitlement state · gating applied per the founder-decided split (**register #14** — decided before this epic starts; standing rule: gate capabilities, never existing data) · grace periods + lapsed-subscriber degradation (graceful, never confiscatory).

## Backlog epics  *(placeholders — one line each, elaborated post-validation)*

- **Web read-only surface** — published-itinerary links open in a browser; the viral-loop unlock (00 §6's recorded consequence).
- **v1.5 webview capture** — "find on Booking.com" in-app browser + capture button; same unfurl pipeline.
- **Friend graph + friends-only visibility** — the reserved enum value activates.
- **Vendor API integrations** — register #9; affiliate revenue; `api:<provider>` items.
- **In-app payments** — the ledger's designed promotion (INV-8 is why it's addition).
- **Push notifications** — Expo push (APNs/FCM via Expo); deferred by founder decision — the product overhead (permissions, preferences, deep-linking, per-event policy) outweighs alpha value; nothing in launch depends on it.
- **Moderation tooling** — replaces founder-handled.
- **Influencer program** — account-status layer.
- **Post-validation hardening** — observability, RLS second wall (ADR-003), tested backups, rate limiting (playbook §6 ordering: data-loss/security → downtime → friction).
- **RNFirebase v22 modular API migration** — *(raised at S0.2)* every auth call logs a deprecation warning: the namespaced API (`auth()`, `auth().currentUser`) is removed in the next major, in favour of the Web-modular shape (`getAuth()`, `getApp()`). Not urgent — v25 still works and the warnings are noise, not breakage — but it is a forced migration on someone else's timetable, and the blast radius is small *now* (two files: `authRepository`, `firebaseTokenSource`, by design) and grows with every auth caller. Do it before it becomes a story of its own.
- **Date entry is a text field, not a picker** — *(raised at S0.3, 2026-07-16)* the create screen asks travelers to type `2027-01-10` by hand, and rejects "next June" with a format error. Confirmed rough on the device, by the agent and the owner both. Deliberately not fixed in the walking skeleton: a picker is a native-dependency decision (community picker vs. platform modal vs. a date library) that E0 has no business making for the rest of the product, and the field is optional, so nothing is blocked. It becomes real the moment a traveler who is not us types a date — **S1.3 (itinerary field edit) is the natural home**, since it touches the same fields and the same screens. Cheap to defer, cheap to fix; recorded so it is a decision rather than a thing everyone stopped noticing.
- **Visual direction & design tokens** — **partially discharged at S0.3 (2026-07-16): the token layer exists; the brand decision does not.** S0.3 built `mobile/src/theme/` (semantic colour roles, type scale, spacing) and screens consume tokens only — which is what makes the palette cheap to change; the irreversible thing was hardcoded values, now banned. Interim token values = the worklog palette, adapted — **an explicit interim, not the decision**: whether that portfolio palette suits a **travel** product (trips, diaries, photos, a public browse feed) or reads as an enterprise tool wearing the wrong clothes remains the open brand-level call. **Due before E4** (the social surface is where strangers first see the product). Outcome remaining: the palette decision as a values-only change plus the ADR recording it. Reusing the worklog palette is a fine answer; it just has to be a decision, not a side effect.

---

## Off-epic standing work

The register #8 unfurler spike — run any time before E6, **after the register #6/#7 UX discussion** (the capture flow and target links shape what the spike should test; founder ruling: Epic 0 ships external links only, untouched by unfurler work) · register #2 analytics events (default set instruments from S0.3 onward, per story ACs; **sink is a structured log line during the build — goes durable before alpha, decided with registers #1/#2** — S0.3, 2026-07-16: build-phase events are disposable, the per-story call sites are the asset) · the regression checklist ratchet (06b §7) · **domain registration + Android `applicationId` (`com.largata.app`) confirmed — gates S0.4's first Play upload** (the applicationId is permanent once uploaded; decided at S0.1 grilling, 2026-07-15).

**Resolution: ☑ Agreed** *(proposed solo — pending founder ratification)*
