# 01 — The chip and the dead labels

**What to build:** A traveler editing their itinerary sees the Draft Workspace's badge chip read **"TRIP WORKSPACE"** instead of "DRAFT TRIP WORKSPACE"; the viewer's chip still speaks lifecycle only (Draft / Ready / Ongoing / Completed, colors untouched). The glossary gains its one amendment line — the canon surface names stay, the editor's *badge copy* is "Trip Workspace" (spec decision 1). The orphaned `workspaceEyebrow` label family ("Draft Workspace", "Planning Finished", …) leaves the tree with its test — exported strings nothing consumes since the S4.17 redesign (spec decision 6).

**Blocked by:** None — can start immediately.

**Status:** done

- [x] The editor surface's chip renders "TRIP WORKSPACE"; the badge-mapping unit tests pin the new label and re-pin all four viewer states unchanged (spec AC 1).
- [x] The glossary amendment lands in `02-domain-model.md`: badge copy only, surface canon names untouched.
- [x] `workspaceEyebrow` and its test are deleted; typecheck is clean and nothing else references the family (spec AC 7).
- [x] Screenshot of the editor header beside S4.17 frame 1, the chip being the only difference (spec's deviation table).
