# 02: The events, and three cycles broken in place

**What to build:** the trip module's published events, landing in its api while every publisher still lives in the old package — old-world code may name the new world, so this needs no migration window. Five events ship: membership arrived (now carrying the trip's id beside the workspace's), membership ended, trip archived, editing session changed, and plan saved. The sixth the spec named, trip unarchived, is **recorded and not built**: unarchive calls nothing in any other module today, and the conventions build an event where a consumer exists. Its trigger is the first consumer.

Three cycles break. Archiving a trip stops calling the invitation service directly and publishes instead; a listener in invitation voids the pending invitations after commit, in the committing thread, so the archive contract test still reads voided statuses on the response it already reads them on. The editing session's three broadcasts and the plan save's one stop calling the topic class and publish instead; a listener in the transport module broadcasts on the same topic with the same type strings and the same field order, and the old topic class is deleted. Its three type-string constants move to the transport module's existing home for event types, so the two websocket frame tests take a renamed-symbol edit and nothing else — the frames themselves must be byte-identical, and those tests are what prove it.

**Blocked by:** None (can start immediately — parallel with 01).

**Status:** ready-for-agent

- [ ] Five event records exist in the trip module's api, each a past-tense fact carrying ids only; trip unarchived is recorded in the spec's comments with its trigger and does not exist in code
- [ ] The membership service no longer names the invitation service; the archive contract test passes with no edited assertion
- [ ] The listener in invitation runs after commit with fallback execution, and a failed reaction is logged at WARN with ids and not retried
- [ ] The old topic class is gone; the transport module's listener broadcasts the editing-session and plan-saved frames on the same topic with the same type strings and field order
- [ ] The two websocket frame tests pass with a renamed-symbol edit only, and no other integration test is edited at all
- [ ] The trip module's regex guard still passes: no file under it names the transport module

## Comments
