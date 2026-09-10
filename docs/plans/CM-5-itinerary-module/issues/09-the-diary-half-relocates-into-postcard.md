# 09: The diary half relocates into `postcard`

**What to build:** the five old Trip Diary screens keep working while the old package goes. The old diary-entry service, entity, repository and photo audience, its request and response records, its two controllers, the per-trip diary lists on the profile and on `me` — all already adapters over the postcard module's legacy-entries port — move into the postcard module as a legacy adapter set with every path and shape unchanged, and the legacy-entries port stops being public api. The old entry table and its photo subject stay. Their deletion keeps its own epic-map line and its original trigger.

**Blocked by:** 08 (The first gate).

**Status:** ready-for-agent

- [x] The eight old diary-entry routes, the `me` diary list and the per-trip diary list answer byte-identical from the postcard module's legacy adapter set
- [x] The legacy-entries port is no longer part of any module's public api
- [x] The five client screens that call these paths are untouched and their Playwright walks pass unedited
- [~] Postcard's guard admits the relocated classes; their tests move with them; every assertion line carried over is listed in this ticket's comments
- [x] The old entry table and its photo subject are untouched

## Amendment — AC2 rests on a premise that is not true

**AC2:** *"The legacy-entries port is no longer part of any module's public api."* It is still `postcard.api.LegacyEntries`, and the ticket's own summary says why it should not be: the diary adapters *"are already adapters over the postcard module's legacy-entries port"*, so once they move **inside** postcard nobody outside needs it.

**Two modules outside postcard use it, and always did.** Measured at the gate:

| Methods | Who calls them |
|---|---|
| `post`, `mine`, `byId`, `alreadyPosted`, `delete`, `recaption`, `pageOfMine` | the relocated adapters only — genuinely internal now |
| `feedPage`, `feedPageOf`, `ofTrip` | **`feed`** — the Home feed |
| `tripsOf` | **`profile`** (the diary sections) and postcard's own `DiaryService` |

So making it internal would break Home and the profile. AC2 is not merely unmet — as written it is **unachievable**, and would have been on the day it was drafted.

**What it was reaching for, and the shape that gets there.** One interface is doing two jobs: a write-and-own-read port for adapters that now live inside postcard, and a cross-module READ api for two other modules. The second is not "legacy" at all — it is postcard's real published contract, wearing a name that says otherwise. The split: a narrow `postcard.api` interface carrying `feedPage`, `feedPageOf`, `ofTrip`, `tripsOf` and the two records they return; `LegacyEntries` moves out of `api` into postcard's internals with everything else; `PostcardLegacyEntries` implements both. 67 lines, 2 nested records, 3 consumer files, all compiler-checked and covered by the 107 ITs over feed and profile.

**DONE 10/09/2026, after the founder asked why it was optional — and the honest answer was that it was not.** `postcard.api.SharedEntries` now carries the four cross-module reads and the two records; `LegacyEntries` moved to `postcard.legacy`, extends it, and keeps the write surface the relocated adapters use. Zero files outside `postcard` name `LegacyEntries`, and the two that need reads get an api that does not call itself legacy. 497 unit and 193 ITs across feed, profile, postcard and itinerary, all green.

**The reasoning for deferring it, kept because the judgement was defensible and still wrong:** It is a boundary-hygiene refactor rather than a defect — nothing misbehaves today — and doing an interface split on a branch that has only just gone green, at the merge gate, is how a finished story stops being finished. Recorded so it is actionable rather than rediscovered: the epic-map line that cuts the five old Trip Diary screens over already deletes the adapter set, and this split belongs with it or before it.
