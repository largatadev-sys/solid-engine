# S4.14 — Traveler vanity number + founder short handles

Status: ready-for-agent

Pulled early from the epic-map park by founder call, 2026-08-08 — the recorded trigger (the public-profile story) had not fired; the founder overruled it. Grilling record: the struck epic-map entry and the BUILD_STATUS off-epic ledger line of 2026-08-08. Dial: MVP grade throughout (no ledger, no authorization-guard surface).

## Problem Statement

A traveler carries no visible mark of when they joined Largata. The traveler who tested the app through its beta looks identical to one who signs up two years after launch, and the founders — the people whose product this is — carry no visible distinction at all. The one identity-adjacent thing the profile does show is the raw UUID in fine print: machine identity, meaningless to a human. There is status worth flexing (I was here first) and nowhere to flex it.

Separately but bundled by intent: founders want handles that themselves read as founder status — 2 characters, below the universal 3-character minimum — and today the system cannot hold one: the profile-edit screen prefills the handle and submits it on every save, so a stored 2-character handle would fail validation and brick that founder's profile editing entirely.

## Solution

A **vanity number**: a purely decorative, immutable cohort badge shown on the traveler's own profile. Founders share the literal `0` — exclusive to them, unreachable by the scheme. Every other traveler gets `nnxxxx`: `nn` is the cohort month (`01` = the entire beta period; `02` = the launch month; +1 per calendar month after), `xxxx` is a random unique number drawn from that month's pre-shuffled pool, so public numbers never reveal monthly signup volume. The number is allocated automatically at sign-up, backfilled truthfully for everyone who already exists (cohort derived from each traveler's creation date), never changes, and is never recycled. It is never an identifier: the UUID remains the key everywhere, and the number is display-only decoration on the wire.

In the same backfill, each founder receives their chosen 2-character handle as hand-planted data — validation stays 3+ for everyone, and the profile-save path is fixed so a stored short handle survives editing (a universal fix, blind to founders).

## User Stories

1. As a traveler, I want to see my vanity number on my profile, so that I have a permanent mark of when I joined.
2. As a beta traveler, I want my number to begin with `01`, so that my early-adopter status is visible at a glance forever.
3. As a traveler who joins after launch, I want my number's first segment to reflect the app's age in months at my sign-up, so that the badge truthfully tells my cohort.
4. As a founder, I want my profile to show the number `0`, so that founder status is unmistakable and exclusive.
5. As a founder, I want a 2-character handle, so that my handle itself reads as founder status.
6. As a traveler, I want my number to never change, so that its meaning can be trusted permanently.
7. As a traveler, I want my number never reassigned to anyone else, so that it cannot be inherited or faked.
8. As the product owner, I want the per-month portion drawn randomly from a pool rather than sequentially, so that public numbers do not broadcast monthly signup counts to competitors.
9. As a traveler who signed up before this feature existed, I want my number backfilled from my actual sign-up date, so that my cohort is truthful rather than dated to the feature's release.
10. As a traveler, I want my number allocated automatically at sign-up, so that I never take any action to receive it.
11. As a founder with a 2-character handle, I want profile saves to keep working, so that my short handle never bricks my own editing.
12. As a co-traveler, I want invite-by-handle to work with a founder's short handle, so that founders are invitable like anyone else.
13. As a traveler who deletes my account, I want my number to die with it — kept on the anonymized record, never returned to the pool — so that no future traveler inherits it.
14. As the product owner, I want founder status designated once as data with no admin surface, so that no authority machinery exists to operate or secure.
15. As the product owner, I want the 10,001st sign-up in a month to succeed with a wider number, so that growth is never blocked by a formatting promise.
16. As the operator at launch, I want to set a single launch-date config value to move cohorts from `01` to `02` onward, so that launch requires no code change.
17. As a client developer, I want the number as one server-formatted opaque string, so that native and web render identically and neither ever parses it.
18. As a traveler on an old app version, I want `/v1/me` to change additively only, so that my client keeps working (ADR-008).
19. As the security-posture owner, I want logs to keep referencing travelers by UUID only, so that the number never becomes a lookup or correlation key in operational data.

## Implementation Decisions

- **Glossary gains "Vanity Number"** (domain model, at implementation): a purely decorative, immutable cohort badge; never an identifier, never input, never unique-by-contract. Distinct from Handle (unique, functional, changeable) and Display Name (non-unique label).
- **Storage:** two integer columns on the traveler record — cohort month and pool number — plus a partial unique constraint over the pair where cohort > 0. Founders all hold `(0, 0)`; the value `0` is unreachable by the scheme (months start at `01`), so exclusivity needs no constraint.
- **Founder designation is data, not authority:** the backfill migration carries traveler-UUID literals, resolved at implementation time by a one-off read against the named deployed database (emails are PII and never enter a committed file; UUIDs are the sanctioned reference). No runtime founder concept, no admin flow, no assignment surface. The grant is a per-environment data fact: deployed dev now; prod receives its own three-line one-off at the prod-standup story; fresh local databases no-op the founder UPDATE and founders provision there as ordinary beta travelers — correct behavior, not a defect.
- **Cohort arithmetic:** while the launch-date config is unset, every allocation is cohort `01` (the entire beta period, whatever its length). Once set at launch, cohort = `02` plus full calendar months elapsed since the launch date. The config ships unset in every environment.
- **Pool:** one row per unclaimed number per month, generated lazily as a single batch (0000–9999, shuffled) on the month's first allocation — no scheduler. A claim pops one row transactionally with skip-locked semantics inside the provisioning transaction, so a rolled-back provisioning returns its number by transaction atomicity, and concurrent sign-ups never collide. A depleted month continues past 9999; width is a display concern, not an allocation one.
- **Allocation timing:** at traveler provisioning, in the same transaction as the insert. Existing travelers are covered by the backfill (cohort derived from each row's creation timestamp — every pre-launch row lands in `01`; pool numbers assigned randomly).
- **Wire contract:** `/v1/me` gains exactly one additive field — the vanity number as a server-formatted opaque string. Founders: `"0"`. Everyone else: cohort zero-padded to two digits + pool number zero-padded to four, widening naturally when values outgrow the padding. Clients render it verbatim and never parse or submit it. No other DTO changes; the UUID stays the identifier everywhere.
- **Mobile:** the traveler's own profile screen renders the number in the slot that currently shows the raw id; data flows through the repository layer's typed apiClient (ADR-001). No other surface renders it.
- **Handle-save fix, universal and founder-blind** (the no-inline-tier-check rule stays intact — nothing learns what a founder is): the backend treats a submitted handle equal to the traveler's currently stored handle as a no-op, skipping shape validation for the unchanged value, so any stored handle survives profile saves from any client; and the profile-edit client sends the handle only when it actually changed. Two independent halves, either sufficient, both cheap.
- **Founder handles:** each founder's chosen 2-character handle (lowercase shape, reserved-word list respected) is hand-planted in the same backfill. `Handle` validation is untouched — minimum 3 for everyone, forever, until the entitlement seam says otherwise.
- **Candidate-capability note (ADR-009):** **short handle** — status-gated prestige (founders hold 2-character; *granting* short handles generally is influencer-program territory). Joins register #14's wiring map.
- **Logging:** travelers stay referenced by UUID; the vanity number appears in no log line.

## Testing Decisions

- **External behavior only, at the highest existing seam — the HTTP API.** Full-context integration tests (singleton-container base) drive provisioning and read `GET /v1/me`: a freshly provisioned traveler's number matches the pre-launch shape (`01` + four digits); founder rows planted by raw SQL render `"0"`; concurrent provisioning of distinct travelers yields no duplicate number; resubmitting an unchanged handle is a no-op; a profile save carrying an unchanged planted 2-character handle succeeds.
- **The backfill gets a migration-stepping IT** (own container — never the shared singleton —, Flyway to the version before, legacy travelers seeded by raw SQL *including rows bearing the founder-UUID literals*, then stepped to head): cohorts derive from creation timestamps, founders get `(0, 0)`, non-founders get distinct pool numbers. Sabotage-verified, using the resource-recompile invocation the repo has already recorded — without this IT the founder UPDATE matches zero rows on every test surface and the backfill "passes" as a no-op, the exact recorded data-migration trap.
- **A storage-contract IT** in the established storage-spelling family: raw-SQL insertion of a duplicate (cohort, number) pair with cohort > 0 must refuse; a duplicate `(0, 0)` must be allowed. The partial index gets a test that fails if its predicate stops matching.
- **Mobile unit tests:** the profile screen renders the served string verbatim; a pinning test on the profile save — an unchanged handle is not submitted, a changed one is.
- **Three-rung smoke per the standing rule:** API assertions, an emulator walk, and the web-preview driver — green unit tests alone have hidden real bugs twice in this repo.
- **Prior art:** the identity-module Me/handle ITs, the workspace-backfill migration-stepping IT, the handle storage-spelling IT, and the S4.0-era profile-screen Jest suites.

## Out of Scope

- Rendering the number anywhere but the traveler's own profile: rosters, traveler cards, bylines, published projections, and the future public-profile page (that story inherits the number for its projection — the residue recorded in the epic-map entry).
- Any lookup, search, navigation, or input by number, anywhere, ever (Q1's standing decision, not just deferral).
- Entitlement gating of short handles (register #14) and any founder/admin/influencer status machinery.
- The prod founder grant (belongs to the prod-standup story) and actually setting the launch-date value (belongs to launch day).
- Any change to handle semantics beyond the unchanged-value no-op.

## Further Notes

- **Owner inputs at implementation, never committed:** the founder email list (resolved to UUIDs by a query that names its database — the S1.1 rule) and each founder's chosen 2-character handle. The resolved UUIDs are committable; the emails are not.
- **Interaction with account deletion (S5.5, unbuilt):** the number survives anonymization — a serial on an anonymized husk identifies nobody. S5.5's spec must not erase it; noted here so that spec inherits the decision.
- **Deferral was free and the pull was a choice:** cohort reconstructs from creation timestamps and the pool number is random, so building now versus at the trigger produces indistinguishable numbers. The founder pulled it early anyway, on the record.
