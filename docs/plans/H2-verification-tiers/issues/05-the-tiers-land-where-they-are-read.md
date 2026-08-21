# 05 — The tiers land where they are read, and the conflicts are amended

**What to build:** The cadence written into the two places an agent actually reads it — and, more importantly, the existing lines that contradict it **amended in place**. Appending beside a contradicting rule leaves two in force, and whichever a future session reads first wins, silently.

**Blocked by:** nothing, but land it after 01–04 so the commands it documents exist.

**Status:** ready-for-agent

- [x] **CLAUDE.md:103 rewritten in place.** It currently demands *"Before proposing a promotion — the whole stack, once: full mobile suite, full backend ITs…, and `npm run smoke`."* It becomes: **CI green on the branch's HEAD, read not re-run, plus the device walk.** Do not delete the bullet — the next agent fills holes with caution, which means running everything again (decision 14)
- [x] **Both copies of "read the counts, never the exit code" narrowed**, not deleted. True of the bare `failsafe:integration-test` goal; false of `mvn verify`, which CI has run honestly all along. Name the invocation each applies to
- [x] **Did not re-add "one test suite at a time, per stack"** — it is already at CLAUDE.md:81, added by another agent on 2026-08-21. The first draft of this story carried a checkbox to add it; that is exactly the duplication the check-before-adding rule exists to catch
- [x] The three tiers stated in CLAUDE.md's verification section, and **nowhere else** — story-gate tickets keep citing the gate, so the gate stays the single source of what a promotion owes
- [x] `.claude/skills/implement/SKILL.md:11` becomes **"the ticket's own tests; the full suite is CI's, on push."** Silence would read as *be thorough* (decision 11)
- [x] **The same edit landed in `.agents/skills/implement/SKILL.md`** — the two trees are byte-identical mirrors, both tracked, and editing one silently diverges them
**⚠ Open question for the founder, surfaced by H2's code review — not settled here.** *Does "No code comments — none" (06b §10) govern non-source config?* The rule's **Check** enumerates `//`, `/*`, `/**` — C-family tokens only — and §10 already scopes itself by file class (Flyway migrations are exempt), so `ci.yml`'s `#` comments sit outside the letter. But the **rationale** bites regardless: *"a comment has no failure mode — change the code and it stays green while it starts lying."* This branch proved it in a day. A comment reading *"workers=2 is H2's recorded guess, not a measurement"* was **already false when it landed** — ticket 06 recorded the measurement (`625 passed, 5.3 minutes`) in the same branch. Corrected, but the class stays open: a workflow file has no test that can fail and no Gotchas line that travels with it, so §10's *"where the knowledge goes instead"* clause has no vehicle here. **Worth an explicit ruling; H2 did not take one.**

- [x] **Grepped CLAUDE.md before writing** and classified every hit: *contradicts* (amend) · *already exists* (drop) · *narrows* (state the new scope on the existing line). Four hits, all handled — the promotion-gate bullet amended, both exit-code gotchas narrowed, the one-suite-at-a-time rule left alone.

  **But the tick was too broad, and the review caught it.** The rule was applied to CLAUDE.md and *not* to `mobile/.gitignore`, where `*.tsbuildinfo` was appended even though it already existed four lines above under `# typescript`. Duplicate removed. **The rule governs every file a rule is being written into, not just the largest one** — and the miss landed in the same commit that ticked the box claiming otherwise.
