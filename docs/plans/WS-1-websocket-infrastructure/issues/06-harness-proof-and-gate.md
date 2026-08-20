# 06 — The harness proof and the story gate

**What to build:** the Playwright evidence that delivery works at the layer that ships, the device walk, and the gate. A connected-and-dead socket looks exactly like a connected one — every assertion here must name what its failure looks like.

**Blocked by:** 04, 05.

**Status:** needs-triage

- [ ] Playwright (web project): two browser contexts (pool `t1`/`t2`, verified accounts), both on `debug:echo` through the preview container against the local stack — t1 sends, the spec asserts t2 received **at the socket** (an in-page captured frame log), never at a render. State which tag played which role in the write-up.
- [ ] Reconnect spec: kill the connection server-side mid-spec; assert backoff → reconnect → resubscribe → a fresh echo arrives. The failure mode is a hang, not a red assertion — bound every wait.
- [ ] No new `ws` dependency enters the harness (spec decision 7). If a server behavior proves unprovable through the browser, stop and record it here — that finding is the only thing that reopens the decision.
- [ ] Device walk: dev build on the emulator against the local stack — subscribe, background the app, foreground it, assert re-establishment (logcat) and a post-reconnect echo. Note the `10.0.2.2` derivation works for `ws://`.
- [ ] Gate (test-scope rule: the full stack once, here): full mobile suite · full backend ITs (`mvn -o test-compile failsafe:integration-test`, counts read from the `Tests run:` summary, never the exit code) · `npm run smoke` whole.
- [ ] BUILD_STATUS row flips in the last commit on this branch; promotion proposed, never executed.
