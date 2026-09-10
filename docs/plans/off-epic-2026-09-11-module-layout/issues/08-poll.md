# 08: poll takes layers

**What to build:** the polls module reads in the converted shape and the voting board behaves exactly as it does today, one vote per member included. `poll` has no `api/` and no in-process caller, so none is minted. Thirteen root classes and seven in `web/` take their folders.

**The move.** `controller/`: `PollController`. `dto/`: `CreatePollRequest`, `CastVoteRequest`, `PollResponse`, `PollBoardResponse`, `PollOptionResponse`, `PollVoterResponse`. `entity/`: `Poll`, `PollOption`, `PollVote`. `repository/`: `PollRepository`, `PollVoteRepository`. `exception/`: `PollExceptions`. `service/`: `PollService`, `PollVoteInserter`, `PollBoard`, `PollView`, `PollOptionView`, `PollTally`, `PollVoterSummary`.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] Every main-tree class of the module sits in a target folder and the module root holds none
- [ ] `PollVoteInserter` keeps its own bean and its `REQUIRES_NEW` — the insert-on-conflict recovery depends on it being a separate bean, and a move must not fold it into the service
- [ ] The boundary test passes with its allowlist (`common`, `identity`, `trip`) unchanged and both predicates still selecting something
- [ ] No test changes but its package line and imports; the poll ITs pass unedited
- [ ] The spec's verification loop, in full, and the structural guards green
- [ ] The last commit sets this ticket `resolved` and flips its ledger glyph; the PR is opened, never merged unasked

## Comments
