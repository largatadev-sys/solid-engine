# 06 — Full-flow verification on the rigs

**Status:** done

**What to build:** nothing — close the spec's ACs on the rungs they belong to, per the standing rule (verify at the layer that ships) and the smoke discipline (API + emulator + web preview, all three). The concurrent-edit walks use the verified pool — **state which tag played which role** (e.g. `t1` = owner, `t2`/`t3` = members). `drive-preview.js` gains lookups for the new screens; every greyed affordance is *driven* on web (a grey that dead-clicks in the browser is the S1.3 bug reborn — intercept `window.alert` in CDP as the harness already does).

**Blocked by:** 01, 02, 03, 04, 05.

- [x] Backend ITs + mobile tests + typecheck green; the full suite runs on the fresh local stack (`docker compose up`)
- [x] Spec ACs 1–9 closed by ITs and the two-account device walk (t1 owner, t2/t3 members): concurrent activity edits · lease refusals · delete guards · owner-only day CRUD · header lease · version-checked reorder · advisory indicator · history rows
- [x] Spec ACs 10–12 walked on the device and in the preview container: workspace screen (owner and member, live and archived) · every grey fires `comingSoon` + analytics on both platforms · tab bar + create flow land on Day 1
- [x] Spec AC 13 round-tripped with pool accounts: handle-addressed invite reaches `t2`'s inbox and accepts; email invite unchanged
- [x] Spec AC 14: attribution chips show "@handle · relative time" on device and web
- [x] Deep links still resolve into the new structure; `pm clear` + relaunch walk follows the recorded pref-push order (CLAUDE.md rig recipe)
- [x] BUILD_STATUS row updated in the last commit on the feature branch (the standing rule)

## Comments

### 2026-07-31 — closed on all three rungs

**Suites.** Backend 87 unit + 401 IT = **488, zero failures**, on the fresh local stack. Mobile **45 suites / 1437 tests**, typecheck clean.

**API rung.** `smoke-api.js` **72/72**. A separate two-account walk (`t1` = owner, `t2` = member) closed the three ACs the ITs could not reach through real HTTP:

- **AC 8** — `t1` holds an activity lease; `t2` is refused **409 EDIT_LOCKED** naming *this activity*; the row is aged past its TTL; `t2` **taps and acquires**, then writes; and `t1` — the original holder — is now the one refused, proving the takeover moved the lease rather than merely permitting a write. *The first attempt asserted the wrong thing:* it sent a bare `PATCH` with no acquire, got a correct 409, and read as a product bug. The AC is about the **tap** — `acquire` takes over an expired lease, while `requireHeldBy` correctly refuses a write from a holder of nothing. Both halves were already pinned by `EditLeaseExpiryIT`; this proves them over the wire.
- **AC 7** — `t1` reorders, `t2`'s now-stale reorder is refused **409 STALE_REORDER**, and refetch-then-reapply lands. The client half is real code at `days/index.tsx`'s call site, not in the mutation hook.
- **AC 10** — archived: owner and member both still read it; **both** are refused **409 TRIP_ARCHIVED** on write, the member's path proving the fence still runs before the role check.

**Web preview.** Every grey *driven*, with `window.alert` intercepted — fork, cover photo, activity history and chat each raised their own distinct message. A click reported `ok` is not evidence; the alert text is. `drive-edit-lock.js` was **rewritten**: it drove S1.4's acquire-on-entry flow, which this story deleted, so it would have passed against a build with no locking at all. It now types a title change and clicks Save — the act that actually acquires the header lease — and returned *"@pool_t1 is editing this trip's details right now."* **Sabotage-checked**: with the lease released it reports `(none fired)`, so it has a failure mode.

**Native.** Full `pm clear` → launch → push `debug_http_host` → force-stop → launch, in the recorded order; signed in as `t1`; all four deep links resolved into the moved route tree (`itineraries/{id}`, `.../days?day=1`, `members/{id}`, `itineraries/create`) with **no route warnings in logcat**; the greyed Home tab raised a real native dialog.

**Not closed here: CI.** `gh` is unauthenticated in this environment, so the run status was never read — flagged to the owner rather than assumed green.
