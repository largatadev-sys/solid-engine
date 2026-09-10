# 05: profile takes layers

**What to build:** the Profile surface's module reads in the converted shape and both the own view and the public view answer exactly as they do today. `profile` is the third composition module; its `api/` holds `DiaryTripResponse`, `ProfileStatsResponse` and `ShowcaseItineraryResponse`, all wire. They move to `dto/`, `api/` goes with its named interface, the two controllers take `controller/` and the service `service/`. The four `Follow*` types the module imports from `identity` stay exactly as they are — the identity split is a grilled story, and this move must not pre-empt it by copying a follow view into profile.

**The move.** `controller/`: `MyProfileController`, `PublicProfileController`. `dto/`: the three records. `service/`: `PublicProfileService`.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] Every main-tree class of the module sits in a target folder and the module root holds none
- [ ] `api/` and its `package-info` are gone; the boundary test loses its contract rule on the ticket 01 pattern, keeps the outside-in rule, and is sabotage-checked with a real usage
- [ ] The module still owns no table and no SQL; its imports from `identity` are unchanged
- [ ] The profile ITs pass unedited
- [ ] The spec's verification loop, in full, and the structural guards green
- [ ] The last commit sets this ticket `resolved` and flips its ledger glyph; the PR is opened, never merged unasked

## Comments
