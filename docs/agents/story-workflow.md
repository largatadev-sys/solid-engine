# Story workflow

How a story moves from an epic-map line to merged code in this repo, and where each step's checkpoint sits. CLAUDE.md deliberately holds the rules every workflow must obey and not the workflow itself; this file is the workflow. It was the agent's private memory until 2026-09-09, when the founder ruled that it belongs in the project, where every agent on the tree can read it.

## The sequence, and who types each step

Every step is typed by the founder. The agent never chains two of them.

1. **Pull.** The founder names the story, usually by its epic-map line. If the line says *grilled when pulled*, the next step is a grilling; if a spec already exists, it is `/to-spec`'s output and the next step is tickets.
2. **`/grill-with-docs`.** The agent interviews the founder in rounds until the frontier is empty, per the `grilling` skill, and sharpens the glossary and ADRs as terms resolve, per `domain-modeling`. **The output is the grilling record** (below) plus the canon it amends. It is *not* a spec.
3. **The founder checks the record.**
4. **`/to-spec`**, typed by the founder. The skill synthesizes the spec from the conversation with no interview, and it carries a checkpoint of its own: it checks the test seams with the founder before publishing. The agent does not write the spec by hand as part of the grilling write-up, however obvious the synthesis looks. *(Learned at CM-5, 2026-09-09: the agent hand-wrote `spec.md` beside the grilling record and put both in the docs PR, skipping the seam check; the founder: "it's better to wait for me to say it explicitly as I also need to check what we grilled, spec and tickets".)*
5. **The founder checks the spec.**
6. **`/to-tickets`**, typed by the founder. The skill has `disable-model-invocation`, so the agent cannot launch it; and the agent never substitutes hand-rolled tickets when the skill is missing from a session's list — the file always exists at `.claude/skills/to-tickets/SKILL.md`, and a `Glob` over that directory has returned one result out of twenty before, so enumerate it with a directory listing before concluding anything is absent. The house ticket format (`docs/agents/issue-tracker.md`) diverges from the skill's template on purpose; follow the house format for the artifact and still honour the skill's process, which quizzes the founder on the breakdown before publishing.
7. **The founder checks the tickets and gives the go-ahead.** Implementation never starts unprompted.
8. **Implement, one ticket at a time**, running `/code-review` on both axes after every ticket, fixing findings, verifying green at the tier the stage calls for (CLAUDE.md's *Scale the run to the stage of the work*), committing to the feature branch, then stopping for the founder unless they have lifted the between-ticket stop for a named range of tickets. The one reason to stop inside a lifted range is a genuine scope fork the spec did not settle, never a mechanical choice. The last ticket is the gate: the walk on the rung that ships, the BUILD_STATUS row, the epic-map annotation, the PR.
9. **The PR is the proposal.** The agent opens it and never merges it (CLAUDE.md's git workflow).

## The grilling record

`docs/plans/<story-id>-<slug>/grilling.md`. Neither `grilling` nor `grill-with-docs` instructs a file; the record exists because CLAUDE.md says nothing load-bearing lives only in a conversation, and CM-2, TW-1 and CM-5 set its shape: rounds as asked, the founder's answers quoted verbatim, the agent's reading under each answer, corrections made in place rather than rewritten, a closing section naming what was written from the record. Where the record and a later spec disagree, the record wins.

## Where the documents land

- **The grilling record and the canon it amends** (glossary rows, ADR amendments, object-contract rows, epic-map annotations, the BUILD_STATUS row) ride **one docs-only PR** against `dev`, on the precedent of the trip-arc record (#50), ADR-039 (#55) and CM-5's record (#56).
- **The spec** rode the same docs PR at TW-1 and CM-3 (#50). Whether it does so again, or lands on the feature branch, is the founder's call at `/to-spec`.
- **The tickets and the build** ride the story's feature branch, `feature/<story-id>-<slug>`, and its one squash-merge.
- **Anything raised along the way** that outlives the story goes to the epic map, its one home.

## Execution needs a plain yes, every time

Editing files and committing to the feature branch is ongoing work. **Executing** — wiping the local database, running a seeder, launching anything against the running stack or an external API, touching a deploy — needs the founder's explicit go **each time**. "Maybe we can X", a question about how X would behave, or approval of a *previous* similar run is not approval. Stated on 2026-08-14 (*"don't execute anything unless i say so, or finalized"*) and violated the same day, when "maybe we can test out the parallel seed" was taken as a green light to wipe the database and launch a 45-minute run. The local database is the founder's review surface; a wipe destroys what they are in the middle of judging, and `docker compose down` has no undo. The gate is on *running*, not on *building*: prepare everything up to the execution line without asking, then state what will run and what it destroys, and wait.

## Grilling a story that builds a seam before any policy uses it

The founder's instinct is policy before mechanism. A story whose value is purely structural — a seam, scaffolding, a chokepoint with no live behaviour — reads as speculative, and the founder would rather bind its birth to the decision that gives it real callers. At S1.8 (2026-07-28) three attempts to explain that wiring is not gating did not move them, because the discomfort was not a misunderstanding. **Make the case for wiring once, concretely** (the actual one-line diff), then move to the park-with-trigger package: what event ships it, what map keeps the retrofit cheap, which docs record the amendment. The productive question is the trigger, not the wiring. Precedents: the EDA parking (2026-07-24), S1.8's entitlement seam (ADR-009), and ADR-039's three deferrals (2026-09-09), each ending as a docs change with a named trigger.

**The boundary, learned at S4.0 (2026-07-30):** this holds for *invisible structure*, not for *visible product surface*. Given designed wireframes, the founder chose the full onboarding flow shipping goals and interests collection knowingly reader-less, plus OTP-over-link and handles-now, reversing three recorded rulings. When design fidelity or product completeness is on one side, expect ship-now; predict parking only when the artifact would be plumbing nobody sees. Record the reader-less choice in the spec as deliberate rather than re-arguing it.

## The verification budget

A story is verified on the rung that ships, never from green suites alone (CLAUDE.md, *Verify on the local full stack*, and *Which build proves what*). Budget the device or LAN walk from the start rather than treating it as optional at the gate: at S1.3 (2026-07-24) backend `verify`, the mobile suite and a twelve-step API smoke were all green, and the emulator still found two real bugs neither layer could see. Scale the runs to the stage of the work as CLAUDE.md says, and treat a batch of founder feedback as **one** iteration: per-file Jest and `tsc` per note, the suite and the container rebuild once when the batch is done.
