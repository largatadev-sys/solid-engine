# Issue tracker: Local Markdown (tracked in git)

Issues and specs (you may know a spec as a PRD) for this repo live as markdown files under `docs/plans/`. They are **tracked in git, not scratch** — the implementation record of every story is part of the repo and survives a fresh clone. Never write them to `.scratch/` (gitignored) or anywhere outside `docs/`.

## Relationship to the epic map and BUILD_STATUS

- `docs/design/07-epic-map.md` is the **durable backlog** and, per CLAUDE.md, the one home for anything raised along the way — ideas, issues, deferred features. A ticket under `docs/plans/` is work already pulled from the backlog; it is not a backlog entry. Anything surfaced mid-story that outlives the story goes to the epic map.
- `BUILD_STATUS.md` is the **live map**. Every story that lands updates its row, and the Plan column links to that story's `docs/plans/<story-id>-<slug>/` directory.

## Conventions

- One story per directory: `docs/plans/<story-id>-<slug>/` — e.g. `docs/plans/S0.1-repo-and-standing-rules/`
- The story id comes from the epic map / BUILD_STATUS story table (`S0.1`, `S1.2`, …) and matches the id in the commit message, so `git log --grep <story-id>` ties commits to the plan
- The spec is `docs/plans/<story-id>-<slug>/spec.md`
- Implementation issues are one file per ticket at `docs/plans/<story-id>-<slug>/issues/<NN>-<slug>.md`, numbered from `01` — never a single combined tickets file
- Triage state is recorded as a `Status:` line near the top of each issue file (see `triage-labels.md` for the role strings)
- Comments and conversation history append to the bottom of the file under a `## Comments` heading
- Off-epic work has no story id — use a dated slug: `docs/plans/off-epic-<YYYY-MM-DD>-<slug>/`, and add its row to the BUILD_STATUS off-epic ledger

## What is immutable and what is not

BUILD_STATUS describes story plans as *immutable point-in-time intent; never updated after the fact*. That rule applies to **`spec.md`** — it records what was intended when the story was pulled, and is not rewritten to match what actually shipped. If intent changes, note the change in the spec's `## Comments` or supersede the story; don't silently edit history.

The **issue files are live working state** and are meant to change: `Status:` transitions during triage, comments append during implementation. Immutability applies to the spec, not to the tickets beside it.

## When a skill says "publish to the issue tracker"

Create a new file under `docs/plans/<story-id>-<slug>/` (creating the directory if needed).

## When a skill says "fetch the relevant ticket"

Read the file at the referenced path. The user will normally pass the path, the story id, or the issue number directly.

## Wayfinding operations

Used by `/wayfinder`. The **map** is a file with one **child** file per ticket.

- **Map**: `docs/plans/<effort>/map.md` — the Notes / Decisions-so-far / Fog body.
- **Child ticket**: `docs/plans/<effort>/issues/NN-<slug>.md`, numbered from `01`, with the question in the body. A `Type:` line records the ticket type (`research`/`prototype`/`grilling`/`task`); a `Status:` line records `claimed`/`resolved`.
- **Blocking**: a `Blocked by: NN, NN` line near the top. A ticket is unblocked when every file it lists is `resolved`.
- **Frontier**: scan `docs/plans/<effort>/issues/` for files that are open, unblocked, and unclaimed; first by number wins.
- **Claim**: set `Status: claimed` and save before any work.
- **Resolve**: append the answer under an `## Answer` heading, set `Status: resolved`, then append a context pointer (gist + link) to the map's Decisions-so-far in `map.md`.
