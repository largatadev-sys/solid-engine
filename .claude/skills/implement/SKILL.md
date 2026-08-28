---
name: implement
description: "Implement a piece of work based on a spec or set of tickets."
disable-model-invocation: true
---

Implement the work described by the user in the spec or tickets.

Use /tdd where possible, at pre-agreed seams.

Run typechecking regularly, single test files regularly.

Once done, use /code-review to review the work.

Commit your work to the current branch, push will trigger the full test suite in CI. Read its result.

Do NOT run the full test suite locally — that is CI's job, on every push (CLAUDE.md, ADR-031). 