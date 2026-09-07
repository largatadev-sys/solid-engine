# 02: The proof that the grammars cannot drift

**What to build:** a build that goes red the moment a future workspace route is declared under one root only, or served by a different method on the two roots. One integration test reads the running application's handler mapping, collects every method-and-pattern pair under the old root, and asserts that the new root has the same pattern, the same HTTP method and the same handler method, minus the thirteen named exclusions, and that no handler exists for a delete on the old root. A second integration test calls both roots with one signed-in traveler and diffs the answers: byte-for-byte for the reads, equal modulo ids and timestamps for writes on two freshly seeded trips, and the masking cases for a non-member and an anonymous caller on both roots. Both reuse the shared test context so the connection ceiling is untouched, and both are sabotage-checked once by hand with the failure line read.

**Blocked by:** 01 (The twins on the wire).

**Status:** ready-for-agent

- [ ] The twin test lists, by name, any old-root mapping without a new-root twin, and any twin served by a different handler; run against ticket 01's tree it lists none
- [ ] The twin test's exclusion set names exactly the thirteen routes the spec excludes, and each exclusion resolves to a registered old-root mapping, so a retired route cannot linger in the list unnoticed
- [ ] The twin test asserts the scan saw at least fifty-five old-root mappings, so an empty scan cannot pass
- [ ] The equivalence test covers the detail, the list, the photo dump, members, invitations, polls, chat, the join link and the preview as reads, one write per resource, and the non-member and anonymous refusals on both roots
- [ ] Sabotage checks recorded in the ticket's comments: one root removed from a twinned controller makes the twin test name that route; a fake delete mapping under the old root makes the pinned-absence assertion fire; one flipped response field makes the equivalence test print the path and the field
- [ ] Neither test introduces a new Spring context signature

## Comments
