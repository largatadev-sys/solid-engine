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
| S0.3 | Create and view an Itinerary (first domain slice, guard included) | 🔄 | [spec](docs/plans/S0.3-create-view-itinerary/spec.md) |
| S0.4 | Both release trains to production (Android: local build → Play internal; iOS deferred — ADR-010) | ⬜ | — |
| **Epic 1 — Collaborative planning** | | | | |
| S1.1 | Workspace forms around an itinerary (creator = owner, atomic; backfills workspaces for pre-E1 itineraries — ADR-011) | ⬜ | — |
| S1.2 | Email invite → accept → member *(resolves reg. #12)* | ⬜ | — |
| S1.3 | Itinerary items CRUD + itinerary field edit, collaborative *(external links + manual fields; edit added at S0.3)* | ⬜ | — |
| S1.4 | Private comments | ⬜ | — |
| S1.5 | Member removal + leave | ⬜ | — |
| S1.6 | Ownership transfer + owner-deletion claim (INV-4) | ⬜ | — |
| S1.7 | Itinerary lifecycle: draft → active → completed *(resolves reg. #10)* | ⬜ | — |
| S1.8 | Entitlement seam: `can(traveler, capability)` service — full access in v1 (ADR-009) | ⬜ | — |
| S1.9 | Itinerary delete (owner-only; INV-4 + workspace lifecycle — added at S0.3) | ⬜ | — |
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
- Register #2 analytics events — COO; default set instruments from S0.3 onward. Sink = structured log line during the build; **goes durable before alpha** (with reg. #1).
- Register #14 free/paid split + pricing — founders; **before Epic 7 starts**.
- Domain registration + `applicationId` (`com.largata.app`) confirmation — **gates S0.4's first Play upload** (permanent once uploaded; S0.1 grilling, 2026-07-15).
