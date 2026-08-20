# 04 — The Playwright spec and the device walk

**What to build:** the story's evidence at the layers that ship. Every socket assertion names its failure mode (WS-1's standing rule — connected-and-dead looks connected).

**Blocked by:** 03.

**Status:** needs-triage

- [ ] Playwright (web project, preview container against the local stack): two contexts, pool `t1`/`t2` (verified accounts; roles stated in the write-up). t1 sends → assert t2 received **at the socket** (captured frame log) *and* the bubble rendered per C1; reload persists. Optimistic send: field clears on release, no duplicate when t1's own broadcast lands.
- [ ] Failed-send spec: intercept the POST to fail once → dim + "Couldn't send" + Retry/Discard per C5; Retry lands the message; a second interception's Discard removes it.
- [ ] Fence specs: archived trip renders the notice bar with no composer (owner context); published trip has no chat door (the redirect) and a direct API send answers `CHAT_CLOSED` (api project).
- [ ] Empty state: fresh trip → exact copy, composer focused.
- [ ] Device walk (dev build, emulator, local stack): send with the on-screen keyboard (dismiss the LogBox banner before any docked-composer tap — the S4.19 trap; collapse the keyboard by its chevron, never `KEYCODE_BACK`); background the app, send as t2 from the web, foreground → the missed message appears via catch-up; screenshot evidence per the standing rules (`/data/local/tmp`, never `/sdcard`).
- [ ] Layout on the phone frame: the composer row and bubble max-width checked on the device (the S3.1 truncation class is invisible on the wider preview viewport).
