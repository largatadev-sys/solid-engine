# 13: `SecurityConfig` owns its anonymous routes, and 06b §11 gets its line

**What to build:** the composition root owns its own list of what a stranger may reach, three modules stop publishing a route constant as their whole in-process interface, and three recorded cycles close — with nothing a traveler can see changing: a join link still opens signed-out, a report still submits signed-out, the WebSocket still upgrades. `SecurityConfig` names `JoinPaths`, `ReportPaths` and `WebSocketPaths` today, and those imports are the `common ↔ join`, `common ↔ report` and `common ↔ ws` cycles the cycle rule tolerates as recorded. It carries the three literals as its own named constants instead; the three classes are deleted; the four test files importing `ReportPaths` take a test-support constant; `report/api` and `join/api` are then empty and go, their guards losing the contract rule on the ticket 01 pattern; `ws` keeps `ConnectionTicketResponse` and nothing else about `ws` moves; the recorded-cycle list shrinks by three, which the cycle rule enforces as shrink-only. No semantic change: the same three matchers, the same `permitAll`.

**The 06b §11 line rides here** because this is where every clause of it becomes measurably true: under *Types at the boundary*, `api/` holds the in-process contract, `dto/` holds the wire, a type is never both, a route constant is neither, and a module with no in-process caller has no `api/`. If this ticket is refused, the line is written in the last merged ticket without the route-constant clause, and that ticket's comments say so.

**Why it waits for a yes.** It edits `SecurityConfig`, which is inside the auth stop rule. It is a relocation of three strings with no behaviour change, in the mould of ADR-039 decision 5's *"a relocation with no semantic change"*, which still ran the gate.

**Blocked by:** 07, 10, 11, and a founder yes recorded under Comments before the ticket is claimed.

**Status:** claimed

- [ ] `SecurityConfig` lists the three anonymous routes as its own constants, named for what they admit
- [ ] `JoinPaths`, `ReportPaths` and `WebSocketPaths` are deleted; `report/api` and `join/api` are gone with their `package-info`s; their guards lose the contract rule and are sabotage-checked with a real usage
- [ ] The discriminating check: the ITs asserting anonymous access to the three routes — the join link opened signed-out, the report submitted signed-out, the WebSocket handshake — pass unedited; a relocated literal that no longer matched would fail one of them with a 401
- [ ] The cycle rule's recorded list shrinks by three and the test passes; the two `identity` cycles stay recorded
- [ ] The 06b §11 line is written, measured against the tree as it stands after this merge
- [ ] The epic map's cycle-rule line gains a *SecurityConfig half built* note in the same PR
- [ ] The spec's verification loop, in full, and the structural guards green
- [ ] The last commit sets this ticket `resolved` and flips its ledger glyph; the PR is opened, never merged unasked

## Comments

**2026-09-11 — the founder yes this ticket waits on.**

Asked directly, after the ticket was summarised for them: what it changes, that it closes three of the five recorded cycles, that there is no semantic change, and that it needs their yes because it edits `SecurityConfig`, which is inside the auth stop rule. The founder answered **"go ahead"**.

Recorded here rather than only in a commit message because this ticket's own Blocked-by line requires *"a founder yes recorded under Comments before the ticket is claimed"* — so the record has to exist before the work does, and this commit is the claim.

**What is authorised is exactly what this ticket describes:** three route literals move into the composition root as its own constants, three classes are deleted, two now-empty `api/` packages go with them, and the recorded-cycle list shrinks by three. The same three matchers, the same `permitAll`, nothing a traveler can see. Anything beyond that is a separate ask.
