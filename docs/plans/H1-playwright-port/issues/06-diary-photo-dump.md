# 06 — The record: diary and Photo Dump

**What to build:** The living `drive-diary` and `drive-photo-dump` walks ported. A traveler posts a postcard from an activity and the dump receives an upload — with Playwright's native file-input handling replacing the CDP planted-file workaround.

**Blocked by:** 01 — Foundation + the discovery pilot.

**Status:** ready-for-agent

- [ ] The diary spec covers what its walk covered: composing a postcard from an activity, the snapshot rendering, the preview dialog behaviour
- [ ] The photo-dump spec covers what its walk covered: upload into the pool, the grid rendering, remove behaviour
- [ ] File uploads use the runner's native file-input mechanism — the prototype-patching workaround is not ported
- [ ] Uploads carry real committed fixture images that a screenshot can vouch for
- [ ] Every `/v1` media call carries a bearer token — no anonymous GETs
- [ ] `drive-diary.js` and `drive-photo-dump.js` are deleted
