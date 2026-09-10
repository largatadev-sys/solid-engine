# 09: poll takes layers

**What to build:** `poll` moves onto the layer folders. It has no `api/` and no in-process caller, so none is minted. Thirteen root classes and seven in `web/` split as below.

| Folder | Files |
|---|---|
| `controller/` | `PollController` |
| `dto/` | `CreatePollRequest`, `CastVoteRequest`, `PollResponse`, `PollBoardResponse`, `PollOptionResponse`, `PollVoterResponse` |
| `entity/` | `Poll`, `PollOption`, `PollVote` |
| `repository/` | `PollRepository`, `PollVoteRepository` |
| `exception/` | `PollExceptions` |
| `service/` | `PollService`, `PollVoteInserter`, `PollBoard`, `PollView`, `PollOptionView`, `PollTally`, `PollVoterSummary` |

**Blocked by:** None.

**Status:** ready-for-agent

- [ ] The spec's done-checklist, in full
- [ ] `PollVoteInserter` keeps its own bean and `REQUIRES_NEW` — the insert-on-conflict recovery depends on it being a separate bean, and a move must not fold it into the service
- [ ] `PollModuleBoundaryTest` passes with both predicates still selecting something; its allowlist (`common`, `identity`, `trip`) is unchanged

## Comments
