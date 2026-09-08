# 05: The record

**What to build:** the written rules match the build. The module-conventions decision is amended in two places: its cross-module rule becomes general and forward-binding — every module, every story from here, not a convention each story chooses to apply — and its no-cross-module-transaction rule gains its fourth recorded exception, the diary delete, with the reason and the trigger that retires it. The reason matters more than the exception: the foreign key already couples those two modules at the schema level, so the shared transaction adds no coupling the schema does not impose, and decoupling the transaction first would mean building an outbox to restore a guarantee just destroyed. Its trigger is the story that drops the key.

The raw-SQL waiver gains the list of tables it covers, so the one place raw SQL is legal cannot widen unnoticed — it widened by a table and back during the trip-grammar story with no signal either way. The epic map's line is annotated built, and the tracker row goes done with its status and spec link and nothing else, in the last commit on the branch.

**Blocked by:** 04 (The rule becomes general, and the build asserts it).

**Status:** ready-for-agent

- [ ] The cross-module rule reads as general and forward-binding, and names where the rollout is staged rather than implying the tree is already there
- [ ] The fourth transaction exception is recorded with its reason and its trigger, next to the three that already stand
- [ ] The raw-SQL waiver names its tables
- [ ] The epic map's line records built, with anything the build changed against the spec
- [ ] The tracker row carries status and spec link only, updated in the last commit on the branch
- [ ] Anything the build surfaced that outlives the story is a line in the epic map's backlog, not a comment in code

## Comments
