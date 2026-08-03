# 02 — The lifecycle comes back: controls, chips, badges

**Status:** done

**What to build:** the lifecycle becomes visible and drivable again. The traveler moves a trip along `draft → active → complete` with two explicit controls (*Start trip*, *Mark complete*) and a one-step *Reopen*, all on the trip workspace's Details tab beside the existing acts — never derived from dates, which is what killed the gate at ADR-017. The Trips chips change axis to **Draft / Active / Complete**, mutually exclusive and covering every trip, replacing S4.1's Draft/Private/Public. Publication moves from filter to **row badge**: a published trip carries a badge saying so, and a private one says that, so a mixed list stays readable at a glance (spec decisions 6, 7; ACs 2, 3, 10).

The lifecycle UI came out at the E1 promotion gate — this brings back the transitions and *only* those. The date nudge and the lifecycle banner stay gone (spec, out of scope).

**Blocked by:** 01 (done).

- [x] *Start trip* moves draft → active; *Mark complete* moves active → complete; both are the traveler's act, neither reads a date
- [x] *Reopen* steps back one state; it is absent (not merely disabled) where there is nothing to step back to
- [x] Every lifecycle control is absent or refuses while the trip is published, and the screen says unpublishing is how you move it
- [x] Trips chips read Draft / Active / Complete, default Draft, and filter mutually exclusively — verified by counting rows per chip through the API, not by eyeballing the screen (regression checklist #14)
- [x] A published trip carries a visible badge; a private one carries its own; an unpublished public trip carries neither
- [x] The chips scroll horizontally rather than truncating on a 393px frame (regression checklist #12) — **checked on a screenshot, not `innerText`**
- [x] Every new control is exercised on the device *and* the web preview container — `Alert.alert` is a no-op on react-native-web (the S1.3 trap)
