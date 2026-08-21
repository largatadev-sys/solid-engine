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
- [x] **Grepped before writing, per the standing rule — CLAUDE.md for what each addition touches** and classify every hit: *contradicts* (amend) · *already exists* (drop) · *narrows* (state the new scope on the existing line)
