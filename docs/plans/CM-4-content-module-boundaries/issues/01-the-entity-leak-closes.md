# 01: The entity leak closes

**What to build:** diary's stored shape stops travelling into postcard. Diary publishes an interface carrying the two acts postcard needs — minting a trip diary and its day, and reading a day — and a view record carrying only the values postcard actually reads off a day: its identifier, its ordinal and its place. Postcard holds that interface instead of diary's service, and the record postcard's service hands its controllers carries the view instead of the stored day. Nothing a traveler sees changes, and the postcard's own wire shape is untouched — it already flattens those two values rather than exposing the day.

The view stays at three fields on purpose: every field published is a field diary can no longer change freely. Snapshotting the ordinal into the postcard instead is wrong and was rejected at the grilling — a day's ordinal is derived from its date relative to the diary's range, so it shifts when the range is edited, which is the defect the memory story fixed.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] No file under the postcard module names diary's stored types, checked by a search rather than by memory; the interface and the view are the only diary types it holds
- [ ] The view carries the day's identifier, ordinal and place and nothing else
- [ ] A postcard posted on a trip day, and one posted from an activity, both still mint the author's diary and that day when absent and reuse them when present
- [ ] A postcard read answers the same body it did before, including the day's ordinal and the place it falls back to
- [ ] Every existing test passes with no edited assertion; import lines may move
- [ ] The diary module's mint behaviour is untouched — it already reads before it writes, inserts in its own transaction, and recovers by re-reading when it loses the race

## Comments
