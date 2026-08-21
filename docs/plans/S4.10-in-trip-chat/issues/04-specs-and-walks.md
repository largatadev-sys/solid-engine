# 04 — The Playwright spec and the device walk

**What to build:** the story's evidence at the layers that ship. Every socket assertion names its failure mode (WS-1's standing rule — connected-and-dead looks connected).

**Blocked by:** 03.

**Status:** the web and API evidence is done and sabotage-verified; the DEVICE WALK and the phone-frame layout check are **NOT done** — founder ruled 2026-08-21 to stop at web and carry both into ticket 05. They remain OPEN.

- [x] Playwright (web project, preview container against the local stack): two contexts, pool `t1`/`t2` (verified accounts; roles stated in the write-up). t1 sends → assert t2 received **at the socket** (captured frame log) *and* the bubble rendered per C1; reload persists. Optimistic send: field clears on release, no duplicate when t1's own broadcast lands.
- [x] Failed-send spec: intercept the POST to fail once → dim + "Couldn't send" + Retry/Discard per C5; Retry lands the message; a second interception's Discard removes it.
- [x] Fence specs: archived trip renders the notice bar with no composer (owner context); published trip has no chat door (the redirect) and a direct API send answers `CHAT_CLOSED` (api project).
- [x] Empty state: fresh trip → exact copy, composer focused.
- [ ] **OPEN — carried to ticket 05.** Device walk (dev build, emulator, local stack): send with the on-screen keyboard (dismiss the LogBox banner before any docked-composer tap — the S4.19 trap; collapse the keyboard by its chevron, never `KEYCODE_BACK`); background the app, send as t2 from the web, foreground → the missed message appears via catch-up; screenshot evidence per the standing rules (`/data/local/tmp`, never `/sdcard`).
- [ ] **OPEN — carried to ticket 05.** Layout on the phone frame: the composer row and bubble max-width checked on the device (the S3.1 truncation class is invisible on the wider preview viewport).

## Comments

**2026-08-21 — the web and API rungs are closed and sabotage-verified; the device rung is deliberately not.**

**`e2e/api/chat.spec.ts` — 12 passed.** The fence ladder at the wire: both doors answering 404 to a non-member, the publish flip both ways (`CHAT_CLOSED` for **owner and member alike**, then a reopen with history intact), reads staying open while published, the archive pair (`TRIP_ARCHIVED` for the owner, 404 for the member), validation at and past the cap, and a **page-following loop with a repeat-cursor guard** so a server bug degrades instead of spinning (the S3.1 loop that died on a heap OOM).

**`e2e/web/chat.spec.ts` — 9 passed** through the preview container against the local stack. `t1 = owner, t2 = member`. Delivery is asserted **at the socket**, from an in-page captured frame log, never at a render — the owner sends over REST and the member's socket must receive `chat.message.appended`; the failure mode is an absent frame and every wait is bounded, so it cannot hang. The render is then asserted separately, because "a frame arrived" and "the bubble drew" are different claims. Also: reload persistence, the composer clearing on release with exactly **one** bubble (the dedupe, from the outside), the C5 failed-send flow both ways (Retry lands it, Discard removes it), the archived notice bar with **zero** Send and Message controls, and the empty state's exact copy.

**Sabotage-verified, because a green suite is not evidence.** Made `ChatTopic.broadcastAppended` return before broadcasting, rebuilt the backend, re-ran: **exactly one test failed** — the socket-delivery one — and the other eight did not run. Restored, rebuilt, re-ran: **9 passed**, with `git diff` confirming zero residue. The assertion has a real failure mode and it is the right one.

**Two boxes are OPEN, by founder ruling (2026-08-21), and are carried into ticket 05 rather than quietly dropped.** The device walk (background → foreground catch-up) and the phone-frame layout check both went unrun. **What that leaves unproven is specific, not cosmetic:** WS-1 deferred its reconnect spec and lifecycle walk to this story precisely because chat is the first real subscriber, so `reconnectIfDead()` and the catch-up path have **still never been exercised by a product consumer on any rung**; and the S3.1 truncation class — a trailing control losing the row's last pixels — is invisible at the preview's wider viewport by construction, which is exactly the composer row's shape. The emulator was booted and confirmed healthy (`largata`, `emulator-5554`); only the APK build was skipped.
