# 12: ADR-036, the glossary re-cut, and the epic-map lines

**What to build:** the docs say what the code now does. ADR-036 amends CM-1's ADR-035 with the diary as a collection of days, the memory that creates no trip row, the adapters kept over the old paths and the loose postcards on Home; the glossary defines Diary, Diary Day and Postcard and retires Diary Entry to a pointer; the epic map gains the parked deletion line and the deferred feed-and-workspace-screens line; the contract doc is consolidated.

**Blocked by:** 07 (The backfill), 11 (Postcard detail and filing).

**Status:** ready-for-agent

- [ ] ADR-036 is in the ADR log's table and as a full section, with context, the decision as one piece, the alternatives rejected on the record (memory-as-Trip, a composite create, deleting the old paths), consequences and an invalidating condition
- [ ] The glossary's Diary, Diary Entry and Postcard rows are re-cut to the CM-2 definitions in `grilling.md`, with Diary Day added and Diary Entry reduced to a pointer; the aggregate and flow paragraphs that still describe the projection are amended
- [ ] The epic map carries: the old entry endpoints' deletion, parked with its trigger; the deferred feed card, badge and workspace "Post to diary" screen as a pulled-when-called line; the likes-and-comments deviation noted on the existing E4 lines; the "Standalone content" and 2026-09-04 diary lines marked discharged by this story
- [ ] The contract doc reads as one reference again: every CM-2 act in its table, the adapters marked, the postures section current
- [ ] The candidate-capability and freshness notes in the spec are reflected where those registers live

## Comments
