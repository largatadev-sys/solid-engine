# 04 — The rest of the Trips list: saves land, approved trips appear

**What to build:** a co-member's save is reflected on your Trips card while you are looking at it, and a trip you have just been approved into **appears in the list on its own** — with its pending row clearing from the inbox header in the same motion.

**Blocked by:** 03.

**Status:** ready-for-agent

- [ ] The plan bulk save raises `plan.saved` with a payload; the client absorbs the new plan version into the cached trip. Zero queries.
- [ ] `JoinService` raises `membership.granted` as a **signal** — the client refetches trips **and** the inbox, because a whole trip must appear and the client holds none of its data. This is the one refetch-shaped event on this surface, and the asymmetry is deliberate.
- [ ] **One event, two parts of one screen:** approving a join request makes the trip appear in the list *and* clears the pending row from the inbox header. Assert both from the single event — two events for this would be a design regression, not a convenience.
- [ ] The newly-approved traveler receives it, which depends on ticket 02's ordering (registration before broadcast). Assert it from the *approved traveler's* session, not from a bystander's — a bystander receiving it proves the broadcast, not the thing that was hard.
- [ ] AFTER_COMMIT ITs for both: a rolled-back save and a rolled-back approval broadcast nothing.
- [ ] Playwright, two contexts, for both walks, with no refresh gesture anywhere in either.

## Comments

**2026-08-25, reconciliation with S4.34's close (pre-implementation) — the `membership.granted` invalidation key has a trap S4.34 just finished fixing on two other surfaces.** Focus revalidation's `refetch()` raises `isRefetching`, and binding a pull control to that flag spins it with no gesture — S4.34's review moved Trips and Home onto a gesture-owned `pulling` state (its finding 1, guarded by `focusFreshness.test.ts`). One surface still carries the old binding: the archived list (`app/(tabs)/(trips)/itineraries/archived.tsx`, `refreshing={isRefetching}`). expo-router keeps visited screens mounted, so a broad `invalidateQueries` on the itineraries key from this ticket's signal handler refetches the archived query's live observer too — and its spinner spins on a screen the traveler will return to, invisible on every rung but the device (react-native-web's `RefreshControl` is inert, and the device pass is the deferred one). Either scope the key to what the event actually changes (the active list and the inbox), or move `archived.tsx` onto the `pulling` binding and add it to `focusFreshness.test.ts`'s pullers. Do one of them knowingly; do not discover it on the founder's phone.
