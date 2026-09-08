# 06: Plan, editing and history move

**What to build:** the welded triple relocates as one batch, because none of the three can move without the other two. Editing's lease subjects name the plan's day and activity repositories; the plan's save takes and releases editing's leases; history is written by that same save. The plan slice takes the day and activity records, their repositories and services, the plan tree, the save and version services, the estimated cost, the reorder and stale-plan refusals, the activity photo service and audience, eight DTOs and three controllers. The editing slice takes the lease, its inserter, repository and service, the holder and subject types, the row-backed editing-session seam, the lock refusal, three DTOs and its controller. The history slice takes the entry, its repository, its service and the act enumeration. Roughly fifty-three main files — the bulk of the old package's fifty-six integration tests come with them, taking package and import edits only.

The four event publishes ticket 02 introduced now live inside the trip module, which is the first time the module publishes the frames the transport listens for; the two websocket frame tests are what prove nothing about them moved.

**Blocked by:** 05 (The trip's own slices move — trip, cover, dump, fork, validation).

**Status:** ready-for-agent

- [x] The three slices exist under the trip module and hold the files named above; none remains in the old package
- [x] The two websocket frame tests pass unedited from ticket 02's state, and the frames are byte-identical
- [x] The insert-on-conflict recovery for the editing lease still runs in its own bean with its own transaction, and the test that pins it passes unedited
- [x] The assertion-diff script reports zero differences across every test file this ticket touched
- [x] Both windows are still present, still named, still sabotage-checked
- [x] Every integration test passes with no edited assertion; both Playwright lanes untouched

## Comments

**2026-09-08 — built.** The welded triple relocated as one batch: `plan` 35 · `editing` 15 · `history` 4, matching the spec's 34/15/4. The old package is down from 137 files to **42** — its content half, which stays until CM-5. *(Later 40: ticket 07's correction moved two more trip-only types out on 2026-09-08.)*

*The frames are what prove nothing moved, and they pass unedited.* `EditingSessionEventsIT` **4/4** and `TripListEventsIT` **4/4**, with no edit at all from their ticket-02 state — which is the point of ticket 02 having done the renamed-symbol edit then: the publishers moved into the trip module here, and the frames the transport broadcasts are byte-identical because the listener never changed.

*The lease's insert-on-conflict recovery survived the move intact.* `EditLeaseInserter` is still its own bean with `@Transactional(propagation = REQUIRES_NEW)` and `saveAndFlush` on line 22 — the shape the self-invocation trap requires — and `EditLeaseExpiryIT` passes **7/7** unedited.

*Visibility widened only at slice lines, again compiler-driven:* seven members crossing into `plan` (`Activity.dayId`, `Day.ordinal`/`title`, `ActivitySnapshot.of`, `ActivityPhotoResponse.allOf`) plus `ActivitySnapshot`'s compact constructor, which **must** be public in a public record — the automated widener made it `public static ... of(...)` while leaving the constructor package-private, and `javac` answered `invalid canonical constructor in record`, an error naming a language rule rather than the visibility that caused it.

*Ten more test classes moved with their subjects* — eight to `trip/plan`, two to `trip/editing` — for the same reason as ticket 05: widening production visibility to satisfy a test is the wrong repair. One test *helper* (`UnbookedActivity`) genuinely does cross a slice line, from `plan` into `editing`, and was widened; a fixture is not production surface.

**The guard's own test data is now sweep-proof, because the same trap fired twice.** At ticket 05 a blanket package `sed` rewrote `NewWorldBoundaryTest`'s *positive* case — the line proving the old-world regex fires — and here the automated remapper did it again, turning `import com.largata.itinerary.Itinerary;` into `com.largata.trip.record.Itinerary`, which the regex correctly does not match. Both times the guard failed loudly, so nothing shipped weakened; but a guard whose proof can be silently rewritten by the very refactor it polices is one careless sweep from being a tautology. The fixtures are now **assembled** — `anImportOf("itinerary", "Itinerary")` — so the literal package path no longer appears in the file and no textual sweep can reach it. Worth generalising: **a guard's test-case strings are data about the old world; never let a rename touch them, and prefer building them from parts so a rename cannot.**

*Verified:* ws frame tests + editing + plan ITs **63/63**, guards **17/17**, assertion-diff **0 across 41 files**, full suite green (below). The regex guard's `SLICES_IN_FLIGHT` list grew to nine; ticket 07 deletes the window entirely.
