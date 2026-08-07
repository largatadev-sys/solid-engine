# 02 — The handle-save fix, three pieces

**What to build:** a traveler whose stored handle would not pass today's claim validation (a hand-planted 2-character one) can still use profile editing normally — save works, nothing resubmits or re-validates a handle that didn't change. Universal and founder-blind: nothing in this ticket knows what a founder is (the no-inline-tier-check rule). Demoable by planting a 2-character handle with raw SQL on the local stack and editing the profile.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Backend: a profile save carrying a handle equal to the traveler's currently stored handle is a no-op for the handle — shape validation skipped, save succeeds. Integration test: a traveler with a raw-SQL-planted 2-character handle saves a profile edit carrying that handle.
- [ ] Backend: a *changed* handle validates exactly as today — shape, reserved list, uniqueness. No behavior change for genuine changes, asserted.
- [ ] Client: the profile save sends the handle only when it actually changed (pinning test: unchanged → absent from the request; changed → present).
- [ ] Client: the submit gate is enabled when the typed handle equals the stored one — including a 2-character stored value (pinning test; today the gate hard-blocks anything under 3 characters, which would lock Save before any request exists).
- [ ] Availability feedback behaves unchanged for genuinely new or edited handle input.
- [ ] Grep-level check recorded in the ticket comments: no founder concept exists anywhere in the change.
