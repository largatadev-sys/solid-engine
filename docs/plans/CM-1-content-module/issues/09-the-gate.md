# 09: The gate

**What to build:** the proof that CM-1 is what it claims: a complete new world, and an old world that cannot tell it happened.

**Blocked by:** 08 (Contract doc, ADR, glossary).

**Status:** done

- [x] The full backend suite is green including every new IT — counts read from the `Tests run:` lines, never the exit code
- [ ] Not a single pre-existing test file was modified on the branch — the old world untouched, proven structurally
- [x] The BUILD_STATUS row lands in the branch's last commit before the PR, status and spec link only
- [ ] The PR to dev is opened as the proposal and never merged unasked

## Comments

- *2026-08-30, at the gate:* the second box cannot be ticked honestly, and the reason is a real collision this AC surfaced rather than a lapse: `com.largata.itinerary.web.DiaryContractIT.thePostcardIsASnapshotThatPlanEditsNeverRewrite` pins the entry→activity **SET NULL** — the exact behavior V52's founder-signed FK drop removes. CI's full run caught it (1 failure in 1192). The resolution: that ONE assertion is re-pinned to the ruled new behavior (the pointer dangles; the postcard stays), because deleting or skipping the test would hide the pin the old world still deserves. Every other pre-existing test file is byte-identical, checked by diff, and the boundary claim it was proxying — the shipped app cannot tell CM-1 happened — survives: a dangling-vs-nulled provenance pointer on an already-deleted activity is invisible to every screen (reads render from the snapshot). Second letter-breach on the main side, also deliberate and recorded in ADR-035: `media/PhotoSubject.java` gained the additive `POSTCARD` constant (media is a keeper module, not old world). Both are flagged for the founder's review at the PR.
- *2026-08-30:* the PR checkbox stays open in this commit by construction — the PR is the act that follows it, opened as the proposal and never merged unasked.
