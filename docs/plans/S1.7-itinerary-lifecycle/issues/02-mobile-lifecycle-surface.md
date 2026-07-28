# 02 — Mobile lifecycle surface: badge, banner, nudge, confirm

**What to build:** the trip's phase becomes visible to everyone and movable by the owner. My Trips rows and the trip screen wear a state badge; the owner gets one banner that is both nudge and lever; every act passes a confirm that works on the device and in a browser.

1. **Repository layer:** two mutations — start, complete — through the typed apiClient (ADR-001; no raw fetch in UI code). Each invalidates the itinerary and list queries on success — members discover the change on their next fetch; everything is pull (spec decision 8).
2. **Badge:** a small state badge (`draft` / `active` / `completed`) on each My Trips row and on the trip screen, member-visible — state is a workspace-visible fact under INV-1 and already on the wire. Tolerant of unknown values (the API-type note: `state` is a string, not a union — a future `published` must render harmlessly, never crash).
3. **Banner (owner only):** on a `draft` — Start trip; on an `active` trip — Mark complete. When the relevant date is past, the banner gains nudge copy (*"Start date was Jul 20 — trip underway?"*). Members never see it — the lever is the owner's (the S1.5/S1.6 don't-advertise pattern). An overdue draft offers **Start, never Complete** — the strict two-tap path of spec decision 9. No dismissed-state storage: the banner is passive, which is why it is a banner and not a modal.
4. **The nudge is a pure function:** a date-compare helper (state + optional dates + device-local today in, banner variant out) with the Jest table living on it — the `memberControls` shape. Undated trips: plain banner, no nudge, nothing blocked.
5. **Confirm:** both acts through the platform-forked `confirmWith`; the wording names the consequence (start: the trip goes active; complete: forward-only — there is no un-complete). Exact copy decided here. Cancel must truly cancel — S1.5's rule; ticket 03's preview drive proves it via CDP.
6. **Tests:** the Jest table on the nudge helper (every state × date past/future/absent) · mutation + invalidation wiring · the badge renders each known state and tolerates an unknown one · clean `tsc`.

**Blocked by:** 01 — the endpoints these mutations call.

**Status:** done

- [x] Badge on My Trips rows + the trip screen, member-visible, unknown-state tolerant
- [x] Owner banner: Start on draft / Complete on active; nudge copy when the relevant date is past; members see no lever
- [x] Overdue draft offers Start, never Complete (strict two taps)
- [x] Nudge helper pure + Jest-tabled (device-local today; undated = no nudge)
- [x] Both acts through the platform-forked `confirmWith`; cancel leaves state untouched
- [x] Mutations through the typed apiClient; queries invalidate on success; clean `tsc`

## Comments

**2026-07-28 — done. 34 new Jest tests (548 total), clean `tsc`; proven on both the web preview and a device.**

1. **The nudge is a pure function with the device's local date passed in.** `lifecycleBanner(itinerary, isOwner, today)` returns the act and whether it is overdue; the component renders the answer and holds no logic. Dates compare as `YYYY-MM-DD` strings — `new Date('2027-01-10')` is UTC midnight, which is the *previous day* in Manila, so a trip would read as overdue a day early. `deviceToday()` assembles local parts by hand for the same reason, and both are tabled in Jest.
2. **A filesystem trap worth knowing: `LifecycleBanner.tsx` beside `lifecycleBanner.ts` does not work.** They collide on case-insensitive filesystems (Windows, macOS) and TypeScript resolved the screen's import to the *helper*, failing with "only refers to a type". Renamed to `TripLifecycleBanner.tsx` — a distinct name is the fix that cannot regress; matching case is not. Caught by the local typecheck, which would have surfaced differently (module-not-found) on Linux CI.
3. **A code-review finding fixed here:** the component's javadoc claimed the banner "appears rather than flickering away" while the roster loads. The behaviour is the opposite — nobody is treated as the owner until the roster lands, so it is hidden and then appears. The comment now says so, with the reasoning: flashing a lever at a member and snatching it away reads as a bug in a way an arriving control does not, and on the warm cache (the usual case — the trip screen already fetches this roster for the ownership-offer banner) there is no gap at all.
4. **Argued down at review, on the record:** month-name formatting for the nudge date. The spec's "Jul 20" is illustrative prose in a decision about nudge *behaviour*, and `formatDates` renders raw ISO on every other surface — formatting here alone would make this the only place in the app rendering dates differently.
5. **Evidence beyond Jest.** Web: `drive-lifecycle.js`, **20/20**, both acts driven twice with `window.confirm` intercepted (cancel left server state untouched, confirm acted) and both dialogs' text captured, proving the shared wording module reached the browser. Device: the native `Alert` rendered with identical wording, cancel genuinely cancelled, the overdue draft nudged from the start date and offered **Start not Complete**, and after confirming, the banner switched to nudging from the end date. Then the same trip as t2: badge visible, **no banner at all** — the role gating on glass.
