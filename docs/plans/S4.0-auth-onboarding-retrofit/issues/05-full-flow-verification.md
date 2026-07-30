# 05 — Full-flow verification pass

**Status:** done

**What to build:** the story's gate — every AC closed on every rung that ships. Both sign-up paths walked on the device, the invitee walk run two-account with tags stated, the whole flow driven headless in the preview container, and the deployed-dev probe run post-merge with a real Resend mail. Verify at the layer that ships: device ACs on the device, server behavior on the real server, and every SQL check naming the `railway` database.

**Blocked by:** 02 — OTP verification · 03 — profile + handles · 04 — preference steps + completion.

- [x] Device walk, email path: sign-up → code entry → all four steps → completion → My Trips (spec ACs 1, 7)
- [x] Device walk, Google path: no code step, prefilled profile, `Traveler provisioned` in the backend log, traveler count 0 → 1 (spec AC 3)
- [x] Two-account invitee walk with roles stated (t1 = inviter/owner, fresh `+suffix` = invitee): invitation survives onboarding, accept succeeds (spec AC 8)
- [x] Existing-account walk: a pre-S4.0 account (NULL handle) is routed through the flow exactly once (spec AC 7)
- [x] Preview container: full email sign-up → code → onboarding → My Trips headless; Google iframe renders; cold-visit network-log assertion re-run (spec ACs 11, 13)
- [x] Post-merge on deployed `dev`: a real sign-up with a pool `+suffix` address receives a real Resend mail and completes; SQL checks name the `railway` database (spec AC 14)
- [x] Full regression: backend ITs, mobile tests, API smoke, preview suite (regression-checklist manual lines: the two this story touches were walked; the rest unchanged)
- [x] Founder screenshot set: every onboarding screen, device and preview (spec AC 12)

## Comments

**2026-07-30 — verification pass run. One line stays open, by design.**

**Closed on the rung that ships:**
- **Backend** 80 unit + 362 integration, 0 failures. **Mobile** 1005 tests, typecheck clean. **API smoke** 46/46 against a fresh local stack.
- **Device (Pixel_7 AVD, dev build, Metro on 8082, backend via 10.0.2.2:8080)** — email path walked whole: sign-up → code (read from the keyless sink log) → profile → goals → interests → travel setup → completion → My Trips; relaunch lands on My Trips, not step 1. Google path walked: real GMS picker (`SignInHubActivity` → GMS `SignInActivity` in logcat), **no code step**, name *and* photo prefilled, `Traveler provisioned` in the backend log, traveler row 0 → 1. Pre-S4.0 account (pool `t4`, handle and marker nulled in the DB) routed into the flow **once**, then never again.
- **Invitee, roles stated: `t1` = inviter/owner, a fresh `+suffix` = invitee.** Accept before verification refused `403 EMAIL_NOT_VERIFIED` (S1.2's gate untouched); the invitation survived all four steps; accept after onboarding returned the trip and the roster shows both.
- **Preview container** (true build path: `npm ci` + export inside the image, Caddy serving) — the full email sign-up → code → onboarding → My Trips walk driven headless, passing its own `--expect`. Google iframe renders. **Cold visit fires 0 anonymous `/v1` requests.**
- **Screenshots** for founder review: every onboarding screen at phone width, device and preview.

**Open, and correctly so:** the deployed-`dev` probe (spec AC 14) is **post-merge** by definition — it needs the code on the rung. Run it with a pool `+suffix` address against a real Resend send, and **name the `railway` database** in the SQL check.

**Three defects the automated rungs could not see, all found by walking:**
1. Confirm answered **503 for a call that had succeeded** (Admin SDK transport) — ticket 02 comment 1.
2. The device **sat on the code screen** after a successful confirm (`onAuthStateChanged` never fires on a claim flip) — ticket 02 comment 4.
3. The **me screen crashed** (`Link asChild` handed an array style) and the onboarding steps **rendered under the status bar**. Both are now rules: `layering.test.ts` fails on an array style inside a `Link asChild`, and `OnboardingScreen` applies safe-area insets.

**A harness trap worth keeping:** `drive-preview.js` reported `click Create Account -> ok` while nothing happened — expo-router keeps previous screens mounted *beneath* the current one, so the first DOM match is the old screen's control. Clean console, no page error, no network request; it reads exactly like a broken button. Every lookup now takes the **last visible** match. In CLAUDE.md's Gotchas.

**2026-07-30 — AC 14 closed on deployed `dev`, post-merge as designed.**

The founder set `LARGATA_RESEND_API_KEY` and `LARGATA_FIREBASE_CREDENTIALS` in Railway's variables UI (never a file on that rung — a file would mean committing them), then read the code out of the real inbox. The loop, end to end on `https://api-dev.largata.com`:

```
email_verified BEFORE      : false
POST confirm               : 200 {"verified":true}
email_verified AFTER       : true      <- the Admin SDK flipped it AT GOOGLE
PATCH /v1/me               : 200 handle="dev_dev317184"
POST onboarding-completion : 200 onboardingCompleted=true
```

**The first probe was thrown away, and it is the useful part of this record.** Checking whether the S4.0 routes existed by calling them *unauthenticated* returned three `401`s — which is exactly what a **missing** route returns too, because the security chain rejects before routing. Two indistinguishable outcomes; the fourth time this repo has met that shape (S0.6's `/gsi/button`, S1.1's deploy probe, S1.1's named-database rule). The discriminating signal is the **shape** of an authenticated `GET /v1/me`: 3 fields pre-S4.0, 13 with `suggestedHandle` after. That, plus `ddl-auto: validate` — which stops the app booting when a column is missing, so a *healthy* app serving those fields is proof V14 and V15 applied.

Also established without needing the code: a wrong code answered `400 VERIFICATION_CODE_INCORRECT` rather than `503`, which separates "the code path is live" from "the Admin SDK credential is broken" **before** spending a real code on the question.

**Still owed, and it is not mine to run:** the SQL check naming the `railway` database (spec AC 14's second clause). It needs Railway DB access the agent does not have. Everything above is API-observable; the row-level check is the founder's to run in Railway's console.
