# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

This repo is **single-context**, but it does not use the default `CONTEXT.md` + `docs/adr/` layout. Its domain documentation is the context package indexed in `CLAUDE.md` under `docs/design/`. Read those files — the paths below are the real ones.

## Before exploring, read these

- **`docs/design/02-domain-model.md`** — the glossary and the domain invariants (INV-*). This is the `CONTEXT.md` of this repo.
- **`docs/design/adr-log.md`** — the ADR index (ADR-001 …). Read the ADRs that touch the area you're about to work in.
- **`docs/design/04-architecture.md`** — architecture, and where several ADRs are stated in full.
- **`docs/design/03-tenancy-model.md`** — isolation and the authorization guard. Read this before touching anything workspace-scoped.
- **`docs/design/01-intent-and-constraints.md`** — why the product is shaped the way it is.
- **`docs/design/05-api-conventions.md`** — read before adding or changing any endpoint (/v1 is additive-only, ADR-008).
- **`docs/design/06a-engineering-principles.md`** and **`docs/design/06b-engineering-decisions.md`** — all code conforms to these. Name and justify any pattern used (P9).

Read what's relevant to the topic; don't read all of them every time.

There is no `CONTEXT.md` and no `docs/adr/` at the root, and their absence is **intentional** — don't flag it, don't create them, and don't let `/domain-modeling` fork a second glossary. New terms belong in `docs/design/02-domain-model.md`; new decisions belong in `docs/design/adr-log.md`, numbered in the existing `ADR-NNN` sequence.

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `docs/design/02-domain-model.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal — either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-002 (modules reference each other by ID + service interface only) — but worth reopening because…_

Several ADRs are restated as hard rules in `CLAUDE.md`. Contradicting one of those is a **stop rule**, not a flag: ask the owner.
