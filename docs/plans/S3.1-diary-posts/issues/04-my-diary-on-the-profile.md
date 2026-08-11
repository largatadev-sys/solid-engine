# 04 — My Diary on the profile

**What to build:** The reading surface the founder named: the own Profile tab gains a **My Diary** section listing the traveler's trips that hold entries (a new cursor-paginated summary endpoint — trip id, title, entry count), each opening a per-trip postcard stream — snapshot header (activity title · day · time), photos, caption per entry, newest-last in trip-day order. Author-only by construction: the endpoints only ever serve the caller's own. Entries on an archived trip stay readable here. Both screens are undrawn — design from the app's theme tokens and existing list/card patterns, recorded as the named deviation awaiting the founder's next mock pass. The co-traveler profile stub gains nothing (spec decision 4).

**Blocked by:** 01 — The postcard on the wire *(reads only; independent of tickets 02–03)*.

**Status:** done

- [x] The profile shows My Diary grouped by trip; a trip's stream renders every postcard with snapshot header, photos, caption — web preview and emulator (spec AC 9).
- [x] The summary endpoint pages in the standard cursor shape and returns only the caller's trips-with-entries (IT).
- [x] Entries of an archived trip render in the stream while new writes refuse (spec AC 9).
- [x] The co-traveler profile stub is untouched — asserted in the walk, not assumed (spec AC 6, stub half).
