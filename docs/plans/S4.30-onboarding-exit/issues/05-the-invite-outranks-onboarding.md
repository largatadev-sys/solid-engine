# 05 — The invite outranks onboarding — **NOT DOING**

**Status:** closed 2026-08-23, unbuilt. Founder ruling: *"if the traveler is a fresh signup, of course he needs to go through the full onboarding."*

**What it would have built:** a traveler arriving with a pending invite lands on the postcard before being asked anything about themselves.

**Why it is closed.** It reverses a decision S4.28 took deliberately and with a reason, and the reason survives the argument for reversing it. S4.28 decision 7: *"Since requesting requires a signed-in, onboarded account, approval never admits a half-built identity — onboarding always happened before the request existed."* And its out-of-scope line, which is not a park: *"Link joiners go through the full, unmodified onboarding — **no trimmed path (rejected, not parked)**."*

The guarantee is load-bearing in a way that is easy to miss: **nothing in the backend enforces it.** Creating a join request checks a verified email, not a completed onboarding — so the "always onboarded" property was produced entirely by the gate's ordering. Reversing that ordering would have removed the guarantee **silently**, leaving owners approving requests from travelers with no handle and no profile, with no error anywhere and no line in any spec saying it had changed.

**How it was caught, which is the part worth keeping.** It was not caught by review or by reading the spec. It was caught by `npx jest` — `joinGate.test.ts` failed on two cases, *"finishes onboarding before it honours the link"* and *"never holds a traveler who still owes onboarding"*. Targeted runs missed it: the gate's own suite was green the whole time, and so was the typecheck. This is the third time this repo has paid for the same lesson (`--changedSince` at S4.28, `--findRelatedTests` before it) — **run the full suite before believing a change to shared routing.**

**What this does not block.** The reported bug is fixed by ticket 03: the account in the report was replaying onboarding because completion was never recorded, not because the invite lost a race. Once completion lands with the answers, that traveler is complete and never sees the flow again — invite or no invite. Ticket 02 gives anyone who does not want to answer a way out, which is the same relief this ticket was reaching for, without touching who is onboarded before they request to join.

**What would reopen it.** S4.28's own trigger, unchanged: invite-link conversion visibly dying at the sign-up wall, measured by that story's analytics. The epic map's guest-accounts line is where that lands, not here.
