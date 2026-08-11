# 02 — The tab goes live

**What to build:** The workspace's Photo Dump tab stops being greyed and becomes the pool's surface: a thumbnail grid of every member's photos (authenticated media, thumb variant), an upload tile driving the platform photo picker into the multipart path, delete on your own photos (owner: any) behind the standing confirm fork, and an honest empty state. Repository + query modules follow the house pattern; register-#2 analytics events emit for upload and delete. **The screen has no mock** — design from the app's theme tokens and existing media/grid patterns, and record it as the named deviation awaiting the founder's next mock pass (spec deviation section). The tab row changes only this tab; Chat/Details stay as shipped (the mock's Notes row rides the backlogged day-execution line).

**Blocked by:** 01 — The pool on the wire.

**Status:** needs-triage

- [ ] A member uploads from the tab and the photo appears in every member's grid, web preview and emulator both, all media arriving bearer-authenticated — the ANON-GET tell watched in the driver (spec AC 1).
- [ ] Delete: own photo for a member, any photo for the owner, confirm-before-delete on both platforms (the `window.confirm` stub printing its wording on web).
- [ ] The `comingSoon` gate is gone from this tab only; empty state renders when the pool is empty; analytics events emit for upload and delete (spec AC 7).
- [ ] Jest covers the grid/anatomy pure module and the repository mapping; no raw fetch anywhere (ADR-001).
