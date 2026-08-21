---
name: implement
description: "Implement a piece of work based on a spec or set of tickets."
disable-model-invocation: true
---

Implement the work described by the user in the spec or tickets.

Use /tdd where possible, at pre-agreed seams.

Run typechecking regularly and the ticket's own tests regularly. Do NOT run the full test suite — that is CI's job, on every push (CLAUDE.md, ADR-031). Read its result; do not re-run it locally.

Once done, use /code-review to review the work.

Commit your work to the current branch.
