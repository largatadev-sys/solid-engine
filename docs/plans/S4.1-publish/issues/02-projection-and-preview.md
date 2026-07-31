# 02 — The projection and the preview

**Status:** ready-for-agent

**What to build:** the public page exists and the owner sees exactly it before publishing. A new deliberate read path serves the published projection to any authenticated traveler — never the member view stripped: the plan (days; activities with title, time-of-day, place, description, Creator Tips, creator-stated cost, bare booking URL), duration **derived from the day count**, description, the owner's identity as byline (**current owner, resolved at render** — an ownership transfer moves it), and the derived estimated total (rendered only when every priced activity shares one currency). Structurally absent, forever: absolute dates, lifecycle state, lifecycle stamps, the roster, per-field edit attribution — the absence rule. Private *or archived* → not-found, indistinguishable from never-existing (the S1.6 masking pattern). The owner-facing **preview screen** (the 07/18 mock's frame 6 — amber banner, Publish / Continue Editing) renders this same projection WYSIWYG and replaces ticket 01's interim confirm: the flow becomes preview → publish. The activity editor's field relabels to "Notes & Creator Tips" with its public-on-publish disposition visible — this ticket is the moment tips actually become public (ADR-008 waiver, on record in the spec). The projection's render component is built once, for ticket 03 to reuse.

**Blocked by:** 01 — the visibility fact and its two acts.

- [ ] **The pinned-field-set IT**: the serialized projection payload's field set is asserted exactly — no date span, no lifecycle state, no stamps, no roster, no attribution; the test fails when any field leaks (spec AC 2)
- [ ] A non-member's read: private → not-found · published → 200 · after unpublish → not-found · after archive → not-found (spec ACs 3, 9 public half)
- [ ] The preview renders exactly what the public endpoint serves — dates absent, tips visible, roster absent — and Publish/Continue Editing behave per the mock (spec decision 11)
- [ ] Creator Tips render on the projection's day cards; the editor shows the new label and the public disposition (spec AC 4)
- [ ] Per-activity costs render; the total renders only when all priced activities share one currency — a mixed-currency plan shows prices and no total; "/Person" appears nowhere (spec AC 5)
- [ ] Duration on the projection derives from the day list, not the date span (spec decision 4)
- [ ] After an ownership transfer, the projection's byline is the new owner (spec AC 8)
