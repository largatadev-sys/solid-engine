# 02 — Mobile lifecycle surface: badge, banner, nudge, confirm

**What to build:** the trip's phase becomes visible to everyone and movable by the owner. My Trips rows and the trip screen wear a state badge; the owner gets one banner that is both nudge and lever; every act passes a confirm that works on the device and in a browser.

1. **Repository layer:** two mutations — start, complete — through the typed apiClient (ADR-001; no raw fetch in UI code). Each invalidates the itinerary and list queries on success — members discover the change on their next fetch; everything is pull (spec decision 8).
2. **Badge:** a small state badge (`draft` / `active` / `completed`) on each My Trips row and on the trip screen, member-visible — state is a workspace-visible fact under INV-1 and already on the wire. Tolerant of unknown values (the API-type note: `state` is a string, not a union — a future `published` must render harmlessly, never crash).
3. **Banner (owner only):** on a `draft` — Start trip; on an `active` trip — Mark complete. When the relevant date is past, the banner gains nudge copy (*"Start date was Jul 20 — trip underway?"*). Members never see it — the lever is the owner's (the S1.5/S1.6 don't-advertise pattern). An overdue draft offers **Start, never Complete** — the strict two-tap path of spec decision 9. No dismissed-state storage: the banner is passive, which is why it is a banner and not a modal.
4. **The nudge is a pure function:** a date-compare helper (state + optional dates + device-local today in, banner variant out) with the Jest table living on it — the `memberControls` shape. Undated trips: plain banner, no nudge, nothing blocked.
5. **Confirm:** both acts through the platform-forked `confirmWith`; the wording names the consequence (start: the trip goes active; complete: forward-only — there is no un-complete). Exact copy decided here. Cancel must truly cancel — S1.5's rule; ticket 03's preview drive proves it via CDP.
6. **Tests:** the Jest table on the nudge helper (every state × date past/future/absent) · mutation + invalidation wiring · the badge renders each known state and tolerates an unknown one · clean `tsc`.

**Blocked by:** 01 — the endpoints these mutations call.

**Status:** ready-for-agent

- [ ] Badge on My Trips rows + the trip screen, member-visible, unknown-state tolerant
- [ ] Owner banner: Start on draft / Complete on active; nudge copy when the relevant date is past; members see no lever
- [ ] Overdue draft offers Start, never Complete (strict two taps)
- [ ] Nudge helper pure + Jest-tabled (device-local today; undated = no nudge)
- [ ] Both acts through the platform-forked `confirmWith`; cancel leaves state untouched
- [ ] Mutations through the typed apiClient; queries invalidate on success; clean `tsc`
