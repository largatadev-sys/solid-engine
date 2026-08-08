# BUILD_STATUS — Largata

**What this is:** the live map of what's built — the first thing a cold session reads. Source-of-truth index: design artifacts → `docs/design/` · story plans → `docs/plans/` (immutable point-in-time intent; never updated after the fact).

**Status and a spec link. Nothing else.** No SHAs, no branch names, no summary of what a story proved — the tickets carry the detail, git answers "where does it live" (`git log --grep <story-id>` · `git branch --contains`), and every fact duplicated here is a fact that rots. The tracker is the map; the plans and git are the territory. **On session start: read this, then verify against the code — code wins; flag mismatches.**

**Update this before the merge, not after.** A story's row reaches its final state in the last commit *on the feature branch*, so the squash-merge lands a truthful tracker and nothing follows it. Updating after the merge means committing straight to `dev`, which the git workflow doesn't allow.

Key: ⬜ not started · 🔄 in progress · ✅ done · ⚠ blocked

## Story table *(derived from `07-epic-map.md`)*

| # | Story | Status | Plan |
|---|-------|:---:|------|
| **Epic 0 — Walking Skeleton** | | | | |
| S0.1 | Repo, environments, and the standing rules | ✅ | [spec](docs/plans/S0.1-repo-and-standing-rules/spec.md) |
| S0.2 | Auth end-to-end (Firebase → resource server → Traveler) | ✅ | [spec](docs/plans/S0.2-auth-end-to-end/spec.md) |
| S0.3 | Create and view an Itinerary (first domain slice, guard included) | ✅ | [spec](docs/plans/S0.3-create-view-itinerary/spec.md) |
| S0.4 | Backend to Railway (dev) + founder preview + release train *(re-sliced 2026-07-16; **preprod/prod + promotion deferred**, Play track parked — both backlog)* | ✅ | [spec](docs/plans/S0.4-backend-prod-founder-preview/spec.md) |
| S0.5 | Founder preview polish + physical-phone sideload *(backlog pull 2026-07-17 — cosmetic Google button on the preview + the deferred S0.4 sideload sub-AC)* | ✅ | [spec](docs/plans/S0.5-founder-preview-polish/spec.md) |
| S0.6 | Functional Google sign-in on the founder preview *(raised 2026-07-17 — founder reversal of S0.4's deferral: the preview should work, not just look right; S0.5's tri-state lands it)* | ✅ | [spec](docs/plans/S0.6-functional-google-preview/spec.md) |
| **Epic 1 — Collaborative planning** | | | | |
| S1.1 | Workspace forms around an itinerary (creator = owner, atomic; backfills workspaces for pre-E1 itineraries — ADR-011) | ✅ | [spec](docs/plans/S1.1-workspace-formation/spec.md) |
| S1.2 | Email invite → accept → member *(resolves reg. #12; 2026-07-17 rulings: email-only, decline supported, invite survives onboarding, display-name guaranteed at join)* | ✅ | [spec](docs/plans/S1.2-email-invites/spec.md) |
| S1.3 | Itinerary days + activities CRUD + itinerary field edit, collaborative *(external links + manual fields; edit added at S0.3; 2026-07-17: last-write-wins — locking + activity history post-gate; grilled 2026-07-23: day-indexed, ADR-013)* | ✅ | [spec](docs/plans/S1.3-days-and-activities/spec.md) |
| S1.4 | Itinerary edit lock — single-writer MVP *(re-scoped 2026-07-24: private comments deleted, Comment is public-only → S4.6; supersedes S1.3's LWW — ADR-014)* | ✅ | [spec](docs/plans/S1.4-itinerary-edit-lock/spec.md) |
| S1.5 | Member removal + leave *(grilled 2026-07-27: owner removes / member leaves, one operation; hard delete + register #4 note; lease released transactionally; single additive DELETE)* | ✅ | [spec](docs/plans/S1.5-member-removal-leave/spec.md) |
| S1.6 | Ownership transfer via offer/accept (INV-4) + membership-scoped My Trips *(grilled 2026-07-28: claim flow → S5.5 with its deletion trigger; consent over imposition — the reversal is the record)* | ✅ | [spec](docs/plans/S1.6-ownership-transfer/spec.md) |
| S1.7 | Itinerary lifecycle: draft → active → completed *(grilled 2026-07-28: reg #10 resolved — owner-explicit, dates nudge; `completed` gates nothing; forward-only + write-once stamps; workspace `state` defers to the archive story)* | ✅ | [spec](docs/plans/S1.7-itinerary-lifecycle/spec.md) |
| S1.9 | Itinerary archive *(grilled 2026-07-28, re-titled from "itinerary delete" — founder ruled archive-only, permanent deletion parked with a trigger; register #12 closes: the workspace `state` column ships; unarchive ships; fence = acts on the trip freeze, self-leave survives; evicts nobody)* | ✅ | [spec](docs/plans/S1.9-itinerary-archive/spec.md) |
| **Epic 2 — Decisions** *(deferred behind E4, 2026-07-29 — trigger: the founders' E2 UX-flow discussion)* | | | | |
| S2.1 | Decision + votes (one per member, INV-10) | ⬜ | — |
| S2.2 | Close decision with outcome | ⬜ | — |
| **Epic 3 — The record** *(resequenced behind E4, 2026-07-29; S3.3 resliced into the E4 pull)* | | | | |
| S3.1 | Diary create + contributor grants (INV-2a) | ⬜ | — |
| S3.2 | Diary entries: text + geotag | ⬜ | — |
| S3.3 | Photo/media pipeline (object storage) *(resliced into the E4 pull, 2026-07-29 — builds after S4.1, before S4.3; ADR-021 — Garage locally / Railway Buckets or R2 deployed, backend-URL serving through the audience ladder, strip-and-re-encode at ingest per INV-11; all four greyed media surfaces activate)* | ✅ | [spec](docs/plans/S3.3-media-pipeline/spec.md) |
| **Epic 4 — Social surface** *(pulled next, 2026-07-29 — order amended 2026-07-31: S4.9 → S4.1 → S3.3 → S4.3 → S4.10 → S4.4–S4.8)* | | | | |
| S4.0 | Auth & onboarding retrofit *(grilled 2026-07-30 — full flow pulled forward from pre-alpha; 6-digit OTP + Resend + Admin SDK; handles ADR-015 + palette ADR-016 decided ahead of their pins; merges two backlog lines)* | ✅ | [spec](docs/plans/S4.0-auth-onboarding-retrofit/spec.md) |
| S4.1 | Publish itinerary + visibility *(resolves reg. #11; ADR-017, then ADR-018)* | ✅ | [spec](docs/plans/S4.1-publish/spec.md) |
| S4.11 | Lifecycle, discovery and visibility as three axes *(ADR-019 — supersedes ADR-018's single-column shape; reinstates the `completed` publish gate ADR-017 retired)* | ✅ | [spec](docs/plans/S4.11-three-axes/spec.md) |
| S4.12 | Auth & onboarding fidelity pass *(founder rulings 2026-08-04 on the re-surfaced 07/16 board — tagline, eye glyph, reset placement, completion glyph; the goals minimum drops and the resume ladder stops keying on goal emptiness; the archived export gains its reconciliation note)* | ✅ | [spec](docs/plans/S4.12-auth-onboarding-fidelity/spec.md) |
| S4.13 | Create-flow rebuild + the four-state lifecycle *(ADR-020 — `upcoming` joins the ladder and `active` becomes `ongoing`; Finish Planning is the creation flow's terminal act, the publish gate stays at `completed` and the freeze stays on `published` alone; Trips renders four lifecycle sections, the tab bar drops to four, and the activity gains its booking card)* | ✅ | [spec](docs/plans/S4.13-create-flow-and-lifecycle/spec.md) |
| S4.14 | Traveler vanity number *(grilled, parked and pulled the same day, 2026-08-08 — cohort badge + per-month shuffled-pool allocation, replacing the raw id on the profile; the handle minimum drops to 2 by founder call, to be raised before alpha (epic-map line); the founder `0` grant is deferred to a follow-up migration; candidate capability: short handle → reg. #14)* | ✅ | [spec](docs/plans/S4.14-vanity-number/spec.md) |
| S4.15 | "Plan a Trip" — the simplified create flow + Trips landing reconciliation *(grilled 2026-08-08 — Trip/Itinerary split ratified, register #3 closed; the Trip Created overview partially reverses S4.13 decision 11 on the record; cover thumbnails + publication badges reach the cards; chooser retired; "Add a Past Trip" wontfix)* | ✅ | [spec](docs/plans/S4.15-plan-a-trip/spec.md) |
| S4.16 | Upload on pick — staged media that exists before the trip *(raised by the founder at S4.15's fix pass, 2026-08-08; **needs grilling, not ready to build** — the spec is a proposal that names the orphaned-bytes problem, the quota question and a cheaper 80% rather than assuming the change is worth making. S4.15 already made the flow feel instant via a local preview, so the remaining win must be stated in terms a traveler would notice)* | ⬜ | [spec](docs/plans/S4.16-upload-on-pick/spec.md) |
| S4.2 | Published diaries → Highlights *(resolves reg. #13; detached from the E4 pull 2026-07-29 — hard-depends on diaries, sequenced behind E3)* | ⬜ | — |
| S4.3 | Discovery / browse feed (cursor) | ⬜ | — |
| S4.4 | Stars | ⬜ | — |
| S4.5 | Reviews *(resolves reg. #4)* | ⬜ | — |
| S4.6 | Public comments *(resolves reg. #5)* | ⬜ | — |
| S4.7 | Fork (plan-only copy + Fork Relationship, INV-6) | ⬜ | — |
| S4.8 | Visitor read-only surface (INV-3) | ⬜ | — |
| S4.9 | Trip surfaces retrofit *(grilled 2026-07-31 against the 07/31 trip-creation/workspace mock set — ADR-014 amended to subject-typed leases, built here; activity-history capture; workspace/day/invite/create restructure; invite-by-handle exact-match; tab bar with Home/Search greyed; pulled next, before S4.1)* | ✅ | [spec](docs/plans/S4.9-trip-surfaces-retrofit/spec.md) |
| S4.10 | In-trip chat + activity-history surface *(entered launch scope 2026-07-31 — chat reverses the 2026-07-24 no-planning-conversation ruling on the record; pulled after S4.3; UX flow + grilling due before elaboration, may split there)* | ⬜ | — |
| **Epic 5 — Ledger** *(Full-rigor zone)* | | | | |
| S5.1 | Expense + splits (INV-7, transactional) | ⬜ | — |
| S5.2 | Balances view | ⬜ | — |
| S5.3 | Transfers: settle / waive / reassign (INV-8) | ⬜ | — |
| S5.4 | Aggregate trip cost → published itinerary (INV-2) | ⬜ | — |
| S5.5 | Account deletion = anonymization (completes 01 Compliance) + owner-deletion claim flow *(moved from S1.6, 2026-07-28 — the claim needs deletion to exist; adds `kind` to the transfer record)* | ⬜ | — |
| **Epic 6 — Unfurler** *(spike reg. #8 precedes; UX reg. #7 resolves here)* | | | | |
| S6.1 | Share-sheet capture + paste fallback (dev-build native extension) | ⬜ | — |
| S6.2 | Unfurler worker: Tier 1 OG + Tier 2 JSON-LD, cached, degrade to bare link | ⬜ | — |
| S6.3 | Pending / failed unfurl states in UI | ⬜ | — |
| **Epic 7 — Subscriptions** *(post-validation, pre-beta; stories elaborated at the gate — reg. #14 decides the split first)* | | | | |
| S1.8 | Entitlement seam: `can(traveler, capability)` *(parked out of E1 2026-07-28 at its grilling — ships at reg. #14's decision moment, before this epic, born wired to the first gated capabilities; ADR-009 amended; every spec from S1.9 on carries a one-line candidate-capability note)* | ⬜ | — |

*(Stories past Epic 0 are slice-level titles — elaborated agent-ready just-in-time when pulled, per the playbook. Splits/merges expected; update the table when they happen.)*

## Off-epic ledger *(every change that wasn't a planned story)*

*One entry per change, oldest first. Prose, not a table: these entries run to thousands of characters and a three-column cell renders them as an unreadable column of text.*

**2026-07-15**

Agent-skills config (`docs/agents/{issue-tracker,triage-labels,domain}.md` + `## Agent skills` in CLAUDE.md) and the repo `.gitignore`. Tracker = local markdown under `docs/plans/<story-id>-<slug>/`, tracked in git; domain docs mapped onto the existing `docs/design/` package.

*Why it wasn't a story —* Housekeeping for the build phase — tooling config, no product surface. The `.gitignore` is the structural half of the never-commit-secrets rule and had to exist before the first commit. Overlaps S0.1 (standing rules) but doesn't discharge it.

---

**2026-07-16**

CLAUDE.md gotcha: a killed `mvn verify` orphans its surefire fork, which holds Testcontainers' Ryuk session and wedges every later run at container discovery — with a diagnosis that looks like a broken Docker daemon.

*Why it wasn't a story —* Found while running S0.3's suite, but it is toolchain knowledge, not story work: it costs the next session an hour whatever story they are on. Rides S0.3's branch because that is where it was learned (owner directive: docs travel with the branch).

---

**2026-07-17**

**Epic 0 promoted `dev` → `preprod` → `main`** — the first promotion this repo has run (both branches had never left `initial commit`; nothing was lost or unpushed, it had simply never happened). `dev → preprod` squashed to one commit named for the epic; `preprod → main` fast-forwarded, so both carry the same SHA. The mechanics and the reasoning are now in CLAUDE.md's git-workflow section, which previously said "cherry-pick `dev → preprod`" and would have sent the next session down the footgun path.

*Why it wasn't a story —* Not a story: it is the git discipline the workflow always specified, run for the first time. Founder's point — follow the pipeline even while preprod/prod deployments do not exist, so it is not invented under pressure the day they do. No environments were created; this is branches only.

---

**2026-07-17**

Test-harness capture (post-S0.6, owner directive): `mobile/scripts/drive-preview.js` committed (real headless Chrome, no new dependency) + CLAUDE.md gains the release-build/sideload half of the rig recipe, the "which build proves what" table, and the `.env`-sourcing idiom. Also corrects an S0.6 claim: `/gsi/button` returns **400 even from a real browser while the button renders**, so its status is not an origin signal in any client — the iframe count is.

*Why it wasn't a story —* Toolchain, not product. The trigger was the owner's point that S0.6 re-discovered the rig from scratch and S0.5's driver had been written and thrown away *twice*; a harness that lives only in a transcript gets rebuilt every story. Landed after S0.6 merged, so it is not that story's work.

---

**2026-07-17**

**UX-flow reconciliation** — the UX's 12-flow inventory + discovery mocks walked against the design docs, at the founder's call before starting E1. Docs hold as living baseline. Outcomes: six founder rulings binding E1 (email-only invites · display-name guarantee at join · flat pull-based comments · last-write-wins editing · no handles · minimal onboarding, "Earn from my itineraries" cut) · registers #3/#4/#5/#10/#11 enriched with UX's proposals · new backlog lines (ToS/privacy, full onboarding, mentions+notifications+replies, locking+activity history, unique handle, E4 spec inputs, UX owes E2/E3/E5 flows) · glossary gains **Discovery** vs **Place Search**. Framing confirmed: Epics 0–6 = MVP, validation gate (reg. #1) decides the push to product v1. Epic order and S1.1 scope unchanged.

*Why it wasn't a story —* Not a story: no code, no product surface — the living backlog absorbing UX artifacts before E1's stories are elaborated, per the register discipline. Working agreement recorded: new tech/requirements get analyzed together, then written into the design docs — canon if decided, register/backlog if parked.

---

**2026-07-24**

**EDA/Kafka grilling — parked to the epic-map backlog.** Founder proposal (event-driven architecture + Kafka now) grilled against canon; driver surfaced as learning goal + conviction; feature and scale cases did not survive. Outcome: one backlog entry carrying the EDA adoption ladder (call sites → durable sink → in-process domain events at first consumer → broker only on ADR-002's signal), the downstream-only Kafka shape if it ever enters, and the explicit bar on inter-module transport without all founders. No ADR — parking reaffirms existing canon.

*Why it wasn't a story —* Not a story: no code, no product surface — an idea analyzed together and written into the docs per the working agreement, parked with its trigger rather than decided.

---

**2026-07-27**

**Verified test-account pool + committed smoke harness** (`mobile/scripts/test-pool.js`, `seed-trip.js`, `smoke-api.js`; CLAUDE.md gains the "never invent `@largata.test` again" rule). Every story before this minted throwaway accounts at a **reserved TLD (RFC 2606)** — undeliverable, therefore never verifiable — so `email_verified` could not be satisfied outside ITs and **S1.2's invite → accept had never run on any rung**. Not broken; unreachable. Fixed with no code, no Gmail setting and no backend change: Gmail routes `+suffix` to the base mailbox while Firebase treats each full address as a distinct account (both verified before adopting). Pool `t1–t5` verified once by the founder, plus a deliberately-unverified `u1` as the permanent `EMAIL_NOT_VERIFIED` fixture. Credentials stay in the gitignored `.env`.

*Why it wasn't a story —* Not a story: no product surface — toolchain, found while smoke-testing S1.5 and fixed there because that is where the gap surfaced (the S0.3-gotcha precedent: docs and harness travel with the branch that learned them). Same shape as the 2026-07-17 test-harness capture.

---

**2026-07-28**

**S1.8 entitlement seam — parked at its grilling; ADR-009 amended.** E1 reached the seam story with register #14 undecided; the owner refused mechanism-before-policy — a full-access seam has zero real callers, the shape S1.1's spec refused ("a seam with zero callers proves nothing"), and its ACs cannot be made falsifiable (the repo's own indistinguishable-outcomes rule, as a story). New trigger: **the seam ships at register #14's decision moment** (still before Epic 7), born wired to the first genuinely-gated capabilities. The grilling's yield is recorded in ADR-009's amendment: the **potentially-gated test** (capability, not existing data · footprint-growing · not governance) + the first two candidates (`itinerary.create`; `invitation.send`, the `context?` caller); **every story spec from S1.9 on carries a one-line candidate-capability note**, so the eventual wiring is a directed walk, not archaeology.

*Why it wasn't a story —* Not a story: no code — a planned story descoped on the record per the working agreement; the docs change rather than rot.

---

**2026-07-29**

**Code carries no prose — 06b §10, a CLAUDE.md hard rule, and the sweep that applied them.** The tree held **8,272 comment lines across 285 of 286 source and test files** (43% of backend production source, 29% of mobile), and the audit that preceded this found **nothing had ever required them**: zero mentions across the 43 workflow-skill files, nothing in `docs/agents`, and the single doctrinal line (06a P9) already said *"recording why in the commit message, not a code comment."* The volume was default-by-omission — the failure shape ADR-003 rejected per-service authorization checks over. New rule: source files carry no prose; a trap worth keeping becomes **a named test that fails when it is re-tripped**, or a Gotchas line when no test can catch it. Auditing the seven traps that lived only in comments, **six already had enforcing tests written for exactly them**; the seventh (a component/helper filename colliding on a case-insensitive filesystem) cannot be tested by any assertion and is now the first Gotchas entry to use §10's escape hatch. Carve-out is exhaustive and mechanical — tool directives (`eslint-disable*`, `@ts-expect-error`) are code that happens to use comment syntax; 19 survive. **Flyway migrations are permanently out of scope:** their content is checksummed, so editing an applied one fails validation on every rung that has run it — green on a fresh local DB, dead on deployed dev. Proven semantics-free rather than merely tested: all 151 backend classes disassembled with `javap -p -c` before and after and compared identical instruction-for-instruction; mobile `tsc` clean and 587 tests green. Two pre-existing defects surfaced: a `@ts-expect-error` in `DatePicker.web.tsx` that suppressed nothing (its two-line shape made it apply to the comment's own second line, so tsc had never evaluated it — deleted, not restored), and the sweep's own first pass desynchronising on Java text blocks, which was reverted wholesale rather than patched forward. `.git-blame-ignore-revs` added so blame still points at real authorship.

*Why it wasn't a story —* Not a story: no product surface and no behaviour change — a standards decision plus the mechanical edit that makes the tree obey it. Same shape as the 2026-07-17 test-harness capture: it costs the next session nothing to have, and leaving the tree contradicting a rule it now carries would rot faster than either.

---

**2026-07-29**

**Epic 1 promoted `dev` → `preprod` → `main`** — the second promotion this repo has run, and the first since Epic 0 established the mechanic. `dev → preprod` squashed to **`2fdd884`** (`feat(collab): Epic 1 — collaborative planning, dev-verified`, 374 files); `preprod → main` fast-forwarded to the same commit object, so `git rev-parse main preprod` prints one SHA twice and `git diff main dev` is empty — **prod carries exactly what dev verified**, which is the property the pipeline exists for. Branches only: the `preprod` and `prod` *environments* still do not exist (their standing-work line is unchanged), so nothing deployed from this. **The documented footgun arrived on schedule:** `merge --squash` raised **127 add/add conflicts**, because after Epic 0's squash the branches share no commits and their merge-base is `initial commit`, so git sees every shared file as independently created. Resolved at the tree rather than by hand — `read-tree --reset -u dev`, which *is* what promoting an epic means and is verifiable after the fact — with the safety check done **first**: the two files the promotion removes were each traced to the story that replaced them (`OwnerMembershipResolver` → `RowBackedMembershipResolver` at S1.1; `itineraries/[id].tsx` → the `[id]/` route directory at S1.3). CLAUDE.md's git-workflow section now carries the mechanic so the next promotion does not rediscover it.

*Why it wasn't a story —* Not a story: the git discipline the workflow always specified, run for its second epic. Recorded separately from the gate row above because a promotion and the verification that earns it are different facts — the gate could have concluded "do not promote".

---

**2026-07-29**

**Epic 1 promotion gate — the epic read as one diff for the first time; 11 findings fixed, 4 parked, 1 rejected.** Record: [gate.md](docs/plans/E1-promotion-gate/gate.md). Every story got its own review at its own time, in isolation, so bugs living in the *interaction* between stories were structurally invisible — a per-story review always starts from a clean fixture. Reviewing `preprod..dev` **two-dot** (three-dot would drag Epic 0 back in: 441 files vs. 370, since the squash workflow leaves the branches sharing no commits) surfaced exactly that class. Headline: `itineraryOptions` seeded the trip screen with **`initialData`** from the *unarchived* list, which React Query stamps fetched-now, so against `staleTime: 30_000` a trip archived by another member rendered for 30 s with no badge, no banner and live Edit links — then failed with *"Someone is editing"*. S0.3 wrote that line correctly; S1.3 grew the detail shape and S1.9 added the `archived` dimension, and it went wrong by two later stories moving around it. Also fixed: both known live defects, an exception message that lied at 3 of its 4 call sites (now a private constructor, so the compiler enumerates them), invitation expiry that was **untestable as written** (`Instant.now()` while `MutableClock` existed), a fence tripwire watching 2 of its 4 doors, and the comment sweep's miss of **`mobile/scripts/`** (339 lines) — whose deleted comments turned out to **actively deny two real Chrome port collisions**, and whose removal exposed that `smoke-api.js` hardcoded `http` and could never have reached deployed dev. **Rejected on the record:** correcting a stale test-class name in `V13` — Flyway checksums migration content, so the edit is green locally and fatal on any rung that has run it. **Parked:** S1.2's AC 10/11 (the invitation email is a doorbell, not a key — there is no token column, so nothing in the core loop depends on it) and three epic-map lines. **The three defects that justified the whole exercise were invisible to every green test:** a **UTF-8 BOM** that passed all 309 ITs on the host and killed the container build Railway runs · `smoke-api.js` hardcoding `http`, so it had **never once run against deployed dev** despite reading `LARGATA_API_BASE_URL` · two colliding Chrome debugging ports whose comments **denied the collision**. Regression closed on all five rungs plus both manual checklist lines: 309 backend ITs · 594 mobile tests · 46/46 local · 22/22 preview container · 46/46 deployed dev · a two-account device walk that reproduced the headline defect and showed it fixed · Google sign-in through the real picker with `Traveler provisioned` in the log · six planted secret specimens all blocked. Checklist gains lines **8, 9 and 10**. **One non-defect rode in by owner override:** the **lifecycle UI removal**, parked to S4.1 the day before with the early-pull condition *"only if the three-banner trip screen becomes a demo problem"* — which fired when the founder looked at the running build during this gate. Executed to the parked scope: the banner, date nudge, Start/Complete flows and permanent state badge come out (trip screen **and** My Trips row), archive demotes from a prompting card to a quiet link, the archived notice stays because it explains a frozen screen, and the **API and data are untouched and dormant** (zero backend files changed). The dead client chain went with the UI. Verified on device for owner and member both.

*Why it wasn't a story —* Not a story: no new product surface — the verification gate the git workflow always specified, run for Epic 1, plus the defect fixes it turned up. Same shape as Epic 0's 2026-07-17 promotion line, which needed only one row because that promotion carried no verification substance; this one produced dispositions, a regression run and a walk record, which is why it has a document.

---

**2026-07-29**

**Architecture review of `dev` after S1.9 — six deepening candidates; one shipped, five parked to the epic map.** Ran against the whole tree (131 Java files / 9,160 L; 74 TS / 7,502 L) in deep-module vocabulary. Candidate 6 (the comment policy) was grilled and shipped the same day — see the row above. The other five are now backlog entries under *"Architecture review 2026-07-29"*, each carrying its evidence and **its own trigger rather than a schedule**: the archive fence and edit lease lacking the guard's compile-time guarantee (9 + 9 convention-enforced call sites; 24 files to answer "can this traveler edit right now?") · `WorkspaceService` as a 16-method shallow façade leaking `workspace_id` to 8 external call sites · the offer/accept lifecycle written twice (13 of 15 structural elements shared) · the mobile repository layer at 30-of-31 one-line path templates · trip permissions recomposed at 4 consumers. Two findings are **pre-existing live defects**, flagged as pullable immediately and independently of any refactor: an archived trip's plan route shows *"Someone is editing"* instead of an archive message (`canEditPlan` gates callers, not routes), and the trip screen fires three concurrent uncached `GET /v1/me` because `useMe` is hand-rolled rather than TanStack. One candidate (the mobile repository collapse) **contradicts ADR-001's letter** and is explicitly barred from being actioned without reopening that ADR.

*Why it wasn't a story —* Not a story: no code and no product surface — analysis whose entire output is docs, parked with triggers per the working agreement. Same shape as the 2026-07-24 EDA grilling, which likewise got a ledger line plus a backlog entry. Recorded in full because the alternative is re-deriving the same evidence next pass — the cost this repo has already paid twice on the test harness.

---

**2026-07-29**

**Launch resequenced: E4 pulled ahead of E2/E3 — grilled on the record, the day Epic 1 promoted.** Reorder, not a cut: both epics stay launch scope; the validation gate still waits for Epics 0–6. E2 parked by choice, not blocked (canon's free-standing Decision is shippable; the attachment ruling lands at the founders' E2 UX-flow discussion — now E2's trigger). E3 deferred (diaries land better into a live social surface) and resliced: **S3.3 moves into the E4 pull** as shared infrastructure; **S4.2 detaches**, riding behind E3. Pull order: S4.1 → S3.3 → S4.3 → S4.4–S4.8; cover image designed into S4.1, activating at S3.3 (additive, ADR-008). *(The grilling's step one — a fix batch for the architecture review's two live defects — dissolved on same-day verification: the E1 gate had already fixed both, `gate.md` findings 2/3; the review section's "pullable" line predated the gate absorbing them.)* Palette + @handle decisions pinned before S4.3; Play-account trigger re-pinned to "E2+E3+E4 shipped". Record: the launch-sequence note in `07-epic-map.md`.

*Why it wasn't a story —* Not a story: no code, no product surface — a sequencing decision analyzed together and written into the docs per the working agreement; same shape as the 2026-07-24 EDA parking line.

**2026-07-31**

**Trip-surfaces reconciliation — the 07/31 trip-creation/workspace mock set walked against canon and the implementation; adopted as design baseline, every conflict founder-ruled.** Same discipline as the 2026-07-17 UX-flow reconciliation and S4.0's wireframe walk. Outcomes: **ADR-014 amended** (subject-typed leases — activity/day/header; version-checked reorder; pull-based advisory lock indicator; supersedes its own per-item rejection by answering "partial protection" structurally) · **in-trip chat enters launch scope as S4.10**, partially reversing the 2026-07-24 no-planning-conversation ruling (a new workspace surface; the deleted private Comment stays deleted) · **activity-history re-sliced**: capture at S4.9 (non-backfillable), surface at S4.10 · **owner-only day add/delete, interim** (revisit: validation gate — new backlog line) · glossary gains **Active (workspace)** and **In-trip Chat**, and the **Activity History Entry** entity · pull order now **S4.9 → S4.1 → S3.3 → S4.3 → S4.10 → S4.4–S4.8** · S4.9 specced (`docs/plans/S4.9-trip-surfaces-retrofit/spec.md`, render archived beside it). Confirmed already-true, no change: duration→seeded days (S1.3), per-activity cost columns, attribution pairs, `WorkspaceState`.

*Why it wasn't a story —* Not a story: no code, no product surface — the living backlog absorbing a design artifact before its stories are elaborated, per the working agreement; the build lands as S4.9/S4.10.

**2026-08-07**

**Agent-skills sync from upstream (`mattpocock/skills`), landed at S3.3's close.** The lockfile-managed skill set under `.agents/skills/` + `.claude/skills/` updated to upstream head: 14 skills refreshed in both mirrors, `writing-great-skills` removed upstream and so removed here, `ask-matt` gains `PHASE-BOUNDARIES.md`, `skills-lock.json` re-hashed. Content is upstream's, taken as-is.

*Why it wasn't a story —* Tooling sync, no product surface — the same housekeeping family as the 2026-07-15 agent-skills config line. Committed with S3.3's closeout so the working tree hands over clean.

---

**2026-08-08**

**Traveler vanity number grilled and parked — backlog line in the epic map.** Founder idea stress-tested on the record: a pure status badge (founders share `0`; everyone else `nnxxxx` — cohort month + a random number from a per-month pre-shuffled pool), plus hand-planted 2-char founder handles in the same future backfill. Key rulings: no runtime founder concept and no super-admin (the `(0,0)` rows are the record) · a founder-conditional handle minimum rejected as an improvised entitlement check, recorded instead as the story's candidate capability (short handle, register #14) · deferral is free (cohort reconstructs from `created_at`; the pool number is random), so the whole build waits. **Trigger: the public-profile story.**

*Why it wasn't a story —* Not a story: no code, no product surface — an idea analyzed together and written into the docs per the working agreement; same shape as the 2026-07-24 EDA parking line.

---

## Standing off-epic work

- Register #8 unfurler spike — after the UX discussion (reg. #6/#7), before Epic 6.
- Register #1 validation criteria — COO drafts, founders ratify, **signed before alpha**.
- Register #2 analytics events — COO; default set instruments from S0.3 onward. Sink = structured log line during the build; **goes durable before alpha** (with reg. #1).
- Register #14 free/paid split + pricing — founders; **before Epic 7 starts**. **The entitlement seam (S1.8) ships at this decision moment** — born wired to the first gated capabilities (parked out of E1 2026-07-28; ADR-009 amendment carries the candidate map).
- Domain registration — **resolved: `largata.com` purchased 2026-07-16**; wiring lands in S0.4. The `applicationId` permanence moment travels with the first Play upload (parked Play-track story, epic-map backlog).
- Play developer account creation — **trigger re-pinned 2026-07-29: once E2+E3+E4 ship** (founder-deferred from ~E4 start at the reorder grilling; verification must still complete before the Play internal-track story, pre-alpha). No Apple account until the iOS activation (ADR-010).
