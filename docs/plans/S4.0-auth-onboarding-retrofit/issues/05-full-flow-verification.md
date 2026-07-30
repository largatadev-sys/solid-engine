# 05 — Full-flow verification pass

**Status:** ready-for-agent

**What to build:** the story's gate — every AC closed on every rung that ships. Both sign-up paths walked on the device, the invitee walk run two-account with tags stated, the whole flow driven headless in the preview container, and the deployed-dev probe run post-merge with a real Resend mail. Verify at the layer that ships: device ACs on the device, server behavior on the real server, and every SQL check naming the `railway` database.

**Blocked by:** 02 — OTP verification · 03 — profile + handles · 04 — preference steps + completion.

- [ ] Device walk, email path: sign-up → code entry → all four steps → completion → My Trips (spec ACs 1, 7)
- [ ] Device walk, Google path: no code step, prefilled profile, `Traveler provisioned` in the backend log, traveler count 0 → 1 (spec AC 3)
- [ ] Two-account invitee walk with roles stated (e.g. t1 = inviter, fresh `+suffix` = invitee): invitation survives onboarding, accept succeeds (spec AC 8)
- [ ] Existing-account walk: a pre-S4.0 account (NULL handle) is routed through the flow exactly once (spec AC 7)
- [ ] Preview container: full email sign-up → code → onboarding → My Trips headless; Google iframe renders; cold-visit network-log assertion re-run (spec ACs 11, 13)
- [ ] Post-merge on deployed `dev`: a real sign-up with a pool `+suffix` address receives a real Resend mail and completes; SQL checks name the `railway` database (spec AC 14)
- [ ] Full regression: backend ITs, mobile tests, API smoke, preview suite, and the regression checklist's manual lines
- [ ] Founder screenshot set: palette before/after plus each onboarding screen, device and preview (spec AC 12)
