# 03 — Mobile lock UX: acquire on entry, the modal, offline honesty

**What to build:** every plan-edit surface acquires the lease before showing its form, holds it by renewal while open, releases on exit — and everyone else meets a platform-forked modal naming the editor. Offline, edit entry points say so gracefully; no plan write ever queues.

1. **Acquire-on-entry, the complete surface list (mirrors ticket 02's):** itinerary fields form · day title edit · activity add/edit · activity reorder controls · every plan delete confirm. Through the repository/typed-`apiClient` layer only (ADR-001 — no raw fetch). Acquire succeeds → the form opens; denied → **the modal**: "*{name} is editing this itinerary right now*", dismiss-only (no retry spinner, no polling — pull-based honesty; the traveler tries again themselves).
2. **Hold + release:** renew on the 60s cadence while an edit surface is open (one shared hook, not per-screen timers) · release on save/cancel/back · **navigation-away and app-background release best-effort, never awaited** — expiry is the guarantee (ADR-014), so a failed release is not an error path the UI surfaces.
3. **The modal is platform-forked from day one (spec §modal):** `.native` / `.web` implementations with the wording in one shared module (the S1.3 `comingSoon` pattern — this is exactly the `Alert.alert` no-op trap, and the two delete-confirms S1.3's whole-branch review caught prove per-screen vigilance fails). The lease-denied error from *any* write (the race where the lease expires mid-edit and someone takes it) surfaces through the same forked path — never a silent swallow (the `days.tsx` lesson).
4. **Offline (spec §offline):** entering an edit surface with no connectivity fails at the acquire step with a clear connectivity message — never a dead tap (the S1.3 grey-out rule). **Plan writes are removed from the offline queue**; the read cache is untouched. Whatever queue exclusion looks like in the repository layer, a Jest test pins it: a plan write attempted offline is rejected client-side, not queued.
5. **Tests:** Jest for the acquire/renew/release hook lifecycle (timers faked) · modal fork resolution on both platforms (the S1.3 mock-enforces-native-contract discipline) · denied-acquire → modal with the holder's name · offline entry → connectivity message, nothing queued · analytics log events fire from the client path where applicable.

**Blocked by:** 01 (needs the endpoints). Can run in parallel with 02.

**Status:** open

- [ ] Every plan-edit entry point acquires before opening; denied → the modal with the holder's display name, on device **and** web (spec ACs 1, 7)
- [ ] Renewal holds a long edit session past one TTL without interruption; save/cancel/back releases (spec ACs 3, 5 client-half)
- [ ] Mid-edit lease loss (expiry + takeover) surfaces the forked error path — no silent swallow, no dead state
- [ ] Offline: every edit entry point answers with the connectivity message — never a dead tap, and no plan write ever queues (spec AC 8)
- [ ] Web preview: the modal fires in the container, proven by `drive-preview.js` with CDP dialog/DOM interception — "renders on web" is not "works on web" (spec AC 7)
- [ ] Jest green incl. the queue-exclusion pin and both fork resolutions

## Comments

*(empty — accretes during implementation)*
