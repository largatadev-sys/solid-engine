# S4.3 mock archive

Retrieved 2026-08-14 from Claude Design project `34e84995-d099-46dd-a784-3b762a09d6f4`
("Design improvement request") via the DesignSync MCP.

| File | Source path in the project | What it carries |
|---|---|---|
| `discovery-spec.dc.html` | `Discovery Spec.dc.html` | The live mock — landing, search mode, results, filter sheet — plus behavior cards 1–6, the edge-case grid, and the consistency flags |
| `action-specs.dc.html` | `Action Specs.dc.html` | Action one-pagers. **The Discover half is S4.3's baseline**; the Home half belongs to the future engagement story (epic-map line) |
| `action-card.dc.html` | `ActionCard.dc.html` | The component `action-specs.dc.html` imports via `<dc-import name="ActionCard">`. Archived because without it the one-pagers render empty |

These are **verbatim copies**, not digests — CLAUDE.md's fidelity rule says to read the
mock's own markup for the answer, so the markup is what is archived. They reference
`./support.js`, which is the Design runtime and is not archived: the files are here to be
**read**, not rendered. To see them rendered, open the project.

The spec's recorded deviations (spec.md decisions 9, 10, 13) are deliberate departures from
these files. Where this archive and the spec disagree, **the spec wins** — it is the
ratified artifact and it names each deviation on the record.
