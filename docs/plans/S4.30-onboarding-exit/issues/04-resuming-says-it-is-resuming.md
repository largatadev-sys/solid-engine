# 04 — Resuming says it is resuming

**What to build:** a traveler returning to an unfinished flow is told so, in a line above the step indicator, so that starting at "Step 3 of 4" reads as progress kept rather than a step taken from them.

**The resume order itself does not change and must not.** S4.12 decision 4 made zero goals a legal answer, and decision 5 removed goal emptiness from the resume predicate as its direct consequence — reintroducing it returns a traveler who chose no goals to that step on every cold start, forever. The existing guard in the gate's tests pins this. What is missing is the explanation, not the ordering.

**Blocked by:** 03 — both touch what the flow does on re-entry, and 03 changes how often a resume happens at all.

**Status:** ready-for-agent

- [ ] A traveler entering the flow part-way through sees one line saying they are picking up where they left off.
- [ ] A traveler entering at the first step sees no such line — it is a resume signal, not decoration.
- [ ] It is a line, not a screen (spec D2). This story exists to shorten the flow; a fifth screen to explain the other four would be self-defeating.
- [ ] The resume predicate is untouched, and the test that forbids any resumable shape from landing on goals still passes unchanged.
