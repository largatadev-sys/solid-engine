# 09: The rename

**What to build:** the moved types take the names the founder's model calls for, in a commit of its own after the relocation so the move commits stay pure moves and this one is read as a rename and nothing else. The record becomes Trip; the service becomes the trip service, the facade of that name having retired in ticket 08; the controller becomes the trip controller, its destruction-only namesake having been renamed in ticket 01; the detail response becomes the trip response, the content story's dark record of that name having retired at the grammar story; the state enumeration is absorbed by the trip lifecycle already in the api — same three names, same wire names, storage spelling unchanged and pinned by a test that would fail if it moved.

What does not rename, deliberately and on the record: the table, every path under the old root, the client's hooks and query keys, and anything in the old package. The client's repository was already renamed at the grammar story, so the client takes no change here at all.

**Blocked by:** 08 (The facade retires).

**Status:** ready-for-agent

- [ ] The five renames above are applied, and no type in the trip module carries the old noun in its name except where the old package's staying half still names it through the legacy exemption
- [ ] The lifecycle's wire names and the state column's storage spelling are unchanged, each pinned by a test that fails if it moves
- [ ] The itinerary table, every old-root path, and every client file are untouched — checked by a search, not assumed
- [ ] The rename is one commit, separate from every move commit, so `git log` reads relocation then rename
- [ ] The assertion-diff script reports zero differences across the renamed-symbol edits in the test tree
- [ ] Every integration test passes with no edited assertion; both Playwright lanes untouched

## Comments
