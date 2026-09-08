# 06: Plan, editing and history move

**What to build:** the welded triple relocates as one batch, because none of the three can move without the other two. Editing's lease subjects name the plan's day and activity repositories; the plan's save takes and releases editing's leases; history is written by that same save. The plan slice takes the day and activity records, their repositories and services, the plan tree, the save and version services, the estimated cost, the reorder and stale-plan refusals, the activity photo service and audience, eight DTOs and three controllers. The editing slice takes the lease, its inserter, repository and service, the holder and subject types, the row-backed editing-session seam, the lock refusal, three DTOs and its controller. The history slice takes the entry, its repository, its service and the act enumeration. Roughly fifty-three main files — the bulk of the old package's fifty-six integration tests come with them, taking package and import edits only.

The four event publishes ticket 02 introduced now live inside the trip module, which is the first time the module publishes the frames the transport listens for; the two websocket frame tests are what prove nothing about them moved.

**Blocked by:** 05 (The trip's own slices move — trip, cover, dump, fork, validation).

**Status:** ready-for-agent

- [ ] The three slices exist under the trip module and hold the files named above; none remains in the old package
- [ ] The two websocket frame tests pass unedited from ticket 02's state, and the frames are byte-identical
- [ ] The insert-on-conflict recovery for the editing lease still runs in its own bean with its own transaction, and the test that pins it passes unedited
- [ ] The assertion-diff script reports zero differences across every test file this ticket touched
- [ ] Both windows are still present, still named, still sabotage-checked
- [ ] Every integration test passes with no edited assertion; both Playwright lanes untouched

## Comments
