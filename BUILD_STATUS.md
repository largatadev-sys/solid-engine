# BUILD_STATUS — Largata

**What this is:** the live map of what's built — the first thing a cold session reads. Source-of-truth index: design artifacts → `docs/design/` · story plans → `docs/plans/` (immutable point-in-time intent; never updated after the fact) · commits — located via the commit convention (`git log --grep <story-id>`), **never stored as SHAs here** (SHAs rot the moment a commit is amended, rebased, or squash-merged — the normal flow). The tracker is the map; the plans and git are the territory. **On session start: read this, then verify against the code — code wins; flag mismatches.**

Key: ⬜ not started · 🔄 in progress · ✅ done · ⚠ blocked

## Story table *(derived from `07-epic-map.md`)*

| # | Story | Status | Plan |
|---|-------|:---:|------|
| **Epic 0 — Walking Skeleton** | | | | |
| S0.1 | Repo, environments, and the standing rules | ✅ | [spec](docs/plans/S0.1-repo-and-standing-rules/spec.md) — **on `dev`** (`git log --grep S0.1`). Two device ACs carried to S0.2 (ticket 05); `preprod`/`main` promotion happens at S0.4 with the PaaS |
| S0.2 | Auth end-to-end (Firebase → resource server → Traveler) | ⬜ | **Starts with: install Android Studio + an AVD, then close S0.1 ticket 05's two open device ACs** (dev-build needs the toolchain anyway) |
| S0.3 | Create and view an Itinerary (first domain slice, guard included) | ⬜ | — |
| S0.4 | Both release trains to production (Android: local build → Play internal; iOS deferred — ADR-010) | ⬜ | — |
| **Epic 1 — Collaborative planning** | | | | |
| S1.1 | Workspace forms around an itinerary (creator = owner, atomic) | ⬜ | — |
| S1.2 | Email invite → accept → member *(resolves reg. #12)* | ⬜ | — |
| S1.3 | Itinerary items CRUD, collaborative *(external links + manual fields)* | ⬜ | — |
| S1.4 | Private comments | ⬜ | — |
| S1.5 | Member removal + leave | ⬜ | — |
| S1.6 | Ownership transfer + owner-deletion claim (INV-4) | ⬜ | — |
| S1.7 | Itinerary lifecycle: draft → active → completed *(resolves reg. #10)* | ⬜ | — |
| S1.8 | Entitlement seam: `can(traveler, capability)` service — full access in v1 (ADR-009) | ⬜ | — |
| **Epic 2 — Decisions** | | | | |
| S2.1 | Decision + votes (one per member, INV-10) | ⬜ | — |
| S2.2 | Close decision with outcome | ⬜ | — |
| **Epic 3 — The record** | | | | |
| S3.1 | Diary create + contributor grants (INV-2a) | ⬜ | — |
| S3.2 | Diary entries: text + geotag | ⬜ | — |
| S3.3 | Photo/media pipeline (object storage) | ⬜ | — |
| **Epic 4 — Social surface** | | | | |
| S4.1 | Publish itinerary + visibility *(resolves reg. #11)* | ⬜ | — |
| S4.2 | Published diaries → Highlights *(resolves reg. #13)* | ⬜ | — |
| S4.3 | Discovery / browse feed (cursor) | ⬜ | — |
| S4.4 | Stars | ⬜ | — |
| S4.5 | Reviews *(resolves reg. #4)* | ⬜ | — |
| S4.6 | Public comments *(resolves reg. #5)* | ⬜ | — |
| S4.7 | Fork (plan-only copy + Fork Relationship, INV-6) | ⬜ | — |
| S4.8 | Visitor read-only surface (INV-3) | ⬜ | — |
| **Epic 5 — Ledger** *(Full-rigor zone)* | | | | |
| S5.1 | Expense + splits (INV-7, transactional) | ⬜ | — |
| S5.2 | Balances view | ⬜ | — |
| S5.3 | Transfers: settle / waive / reassign (INV-8) | ⬜ | — |
| S5.4 | Aggregate trip cost → published itinerary (INV-2) | ⬜ | — |
| S5.5 | Account deletion = anonymization (completes 01 Compliance) | ⬜ | — |
| **Epic 6 — Unfurler** *(spike reg. #8 precedes; UX reg. #7 resolves here)* | | | | |
| S6.1 | Share-sheet capture + paste fallback (dev-build native extension) | ⬜ | — |
| S6.2 | Unfurler worker: Tier 1 OG + Tier 2 JSON-LD, cached, degrade to bare link | ⬜ | — |
| S6.3 | Pending / failed unfurl states in UI | ⬜ | — |
| **Epic 7 — Subscriptions** *(post-validation, pre-beta; stories elaborated at the gate — reg. #14 decides the split first)* | | | | |

*(Stories past Epic 0 are slice-level titles — elaborated agent-ready just-in-time when pulled, per the playbook. Splits/merges expected; update the table when they happen.)*

## Off-epic ledger *(every change that wasn't a planned story)*

| Date | Change | Why it wasn't a story |
|------|--------|----------------------|
| 2026-07-15 | Agent-skills config (`docs/agents/{issue-tracker,triage-labels,domain}.md` + `## Agent skills` in CLAUDE.md) and the repo `.gitignore`. Tracker = local markdown under `docs/plans/<story-id>-<slug>/`, tracked in git; domain docs mapped onto the existing `docs/design/` package. | Housekeeping for the build phase — tooling config, no product surface. The `.gitignore` is the structural half of the never-commit-secrets rule and had to exist before the first commit. Overlaps S0.1 (standing rules) but doesn't discharge it. |

## Standing off-epic work

- Register #8 unfurler spike — after the UX discussion (reg. #6/#7), before Epic 6.
- Register #1 validation criteria — COO drafts, founders ratify, **signed before alpha**.
- Register #2 analytics events — COO; default set instruments from S0.3 onward.
- Register #14 free/paid split + pricing — founders; **before Epic 7 starts**.
- Domain registration + `applicationId` (`com.largata.app`) confirmation — **gates S0.4's first Play upload** (permanent once uploaded; S0.1 grilling, 2026-07-15).
