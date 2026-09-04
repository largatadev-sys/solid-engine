# 01 — Profile Visibility and the one read rule

**What to build:** the tracer bullet. A traveler flips their profile private through the profile patch they already have, and from that moment a stranger is refused by name on their diary tab, their per-trip diary and both of their lists, and gets nothing back for a postcard's bytes — while the owner and an approved follower read everything exactly as before. One read rule, defined once in the identity module, answers every one of those fences (spec decisions 1, 2, 8, 9 and the read rule in the API Contract).

**Blocked by:** None — can start immediately.

**Status:** done

- [x] **Schema:** `profile_visibility` on the traveler, text, not null, default `'PUBLIC'`, one additive migration at the next free `V` number. A storage IT pins the enum's storage spelling (the `@Enumerated` gotcha — prior art: the traveler profile storage IT).
- [x] **`GET /v1/me`** returns `profileVisibility` (`public` | `private`). **`PATCH /v1/me`** accepts an optional `profileVisibility`; absent means unchanged, as every field on that patch; any other value is the ordinary validation 400. `profile_visibility_changed` is emitted after commit, ids only, and only when the value actually changed.
- [x] **The read rule, one definition, two forms, owned by identity.** *May viewer V read what author A authored as a person?* — yes if A is public, or V is A, or a Follow edge V → A exists; otherwise no. Exposed as a per-pair check and as the per-viewer **hidden-author set** (private travelers, minus V's followees, minus V). Nothing outside identity reads the traveler or follow tables to answer this (ADR-002); the archived-itinerary-set that the strangers surface already pulls from the workspace module is the precedent for the set form.
- [x] **The public profile read** gains `visibility` and `viewerRelation` — `none` | `following` in this ticket (`requested` arrives at 03). `followedByViewer` and `followsViewer` stay. Always `200` for an onboarded traveler, private or not; the header, bio, vanity number and all four counts render for everyone.
- [x] **`GET /v1/travelers/{handle}/diary/trips`, `/followers`, `/following`** answer **`403 PROFILE_PRIVATE`** when the rule says no. `/published` is untouched — published itineraries are public whoever published them.
- [x] **`GET /v1/feed/postcards/trips/{itineraryId}/by/{authorId}`** answers `403 PROFILE_PRIVATE` under the same rule.
- [x] **Postcard photo bytes:** the diary-entry photo audience consults the rule against the entry's author, so a stranger of a private author gets `404`, a follower and the author get the bytes. The entity-level "shared or mine" check retires in favour of the service-level rule; nothing else about media changes.
- [x] **`PROFILE_PRIVATE`** joins the error envelope as a 403 whose message names privacy and names no traveler.
- [x] **ITs, one per fence, four roles each:** the private owner, an approved follower, a stranger, and a **co-traveler on a shared trip who does not follow** (spec decision 9 — membership grants nothing). Prior art: the S4.36 profile and fence ITs, the S4.37 follow ITs. **Every fence sabotage-checked:** invert the rule, watch the right assertion go red, restore.
- [x] **Byte-identical for public authors:** for a public author every fenced endpoint answers today's body — asserted, not assumed, because that is the whole ADR-008 argument (spec decision 14).
- [x] **Interim state, recorded in this ticket's comments and not "fixed" here:** the open follow of S4.37 is still live, so a stranger can follow into a private profile and read. Ticket 03 closes that door. Do not add a guard in this ticket that 03 would then have to remove.
