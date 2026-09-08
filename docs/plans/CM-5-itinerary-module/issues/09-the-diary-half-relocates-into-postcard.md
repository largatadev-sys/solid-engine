# 09: The diary half relocates into `postcard`

**What to build:** the five old Trip Diary screens keep working while the old package goes. The old diary-entry service, entity, repository and photo audience, its request and response records, its two controllers, the per-trip diary lists on the profile and on `me` — all already adapters over the postcard module's legacy-entries port — move into the postcard module as a legacy adapter set with every path and shape unchanged, and the legacy-entries port stops being public api. The old entry table and its photo subject stay. Their deletion keeps its own epic-map line and its original trigger.

**Blocked by:** 08 (The first gate).

**Status:** ready-for-agent

- [ ] The eight old diary-entry routes, the `me` diary list and the per-trip diary list answer byte-identical from the postcard module's legacy adapter set
- [ ] The legacy-entries port is no longer part of any module's public api
- [ ] The five client screens that call these paths are untouched and their Playwright walks pass unedited
- [ ] Postcard's guard admits the relocated classes; their tests move with them; every assertion line carried over is listed in this ticket's comments
- [ ] The old entry table and its photo subject are untouched
