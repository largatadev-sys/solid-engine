# 05: profile takes layers

**What to build:** the Profile surface's module reads in the converted shape and both the own view and the public view answer exactly as they do today. `profile` is the third composition module; its `api/` holds `DiaryTripResponse`, `ProfileStatsResponse` and `ShowcaseItineraryResponse`, all wire. They move to `dto/`, `api/` goes with its named interface, the two controllers take `controller/` and the service `service/`. The four `Follow*` types the module imports from `identity` stay exactly as they are — the identity split is a grilled story, and this move must not pre-empt it by copying a follow view into profile.

**The move.** `controller/`: `MyProfileController`, `PublicProfileController`. `dto/`: the three records. `service/`: `PublicProfileService`.

**Blocked by:** None (can start immediately).

**Status:** resolved

- [x] Every main-tree class of the module sits in a target folder and the module root holds none
- [x] `api/` and its `package-info` are gone; the boundary test loses its contract rule on the ticket 01 pattern, keeps the outside-in rule, and is sabotage-checked with a real usage
- [x] The module still owns no table and no SQL; its imports from `identity` are unchanged
- [x] The profile ITs pass unedited
- [x] The spec's verification loop, in full, and the structural guards green
- [x] The last commit sets this ticket `resolved` and flips its ledger glyph; the PR is opened, never merged unasked

## Comments

**2026-09-11 — the outside-in rule took a stronger form than this ticket's wording, raised at the series' code review (spec axis).**

The ticket says the guard *"keeps the outside-in rule"*. Profile publishes no refusal either, so after the `api/` deletion it has **no front door at all** — and the rule was widened from *nothing outside may reach behind the front door* to **nothing outside may name any part of the module**. Strictly stronger, and verified: nothing outside `com.largata.profile` names any of it. Sabotage-checked with a real field usage.

Recorded because only ticket 14 states that form in its own text; 03, 05 and 14 all ship it.

