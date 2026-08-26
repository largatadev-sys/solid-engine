# 01 — The profile read + the page

**What to build:** a signed-in traveler opens `/travelers/{handle}` for another onboarded traveler and sees their public face: avatar, display name, `@handle · #vanity`, bio, and two real counts — with the tabs present as honest empty shells. This is the tracer bullet: the by-handle read, the projection contract, and the screen, end to end.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] The by-handle profile read returns the traveler card (id, handle, display name, avatar), bio, vanity number, and the two counts. **The load-bearing IT asserts the exclusion list on the serialized wire, not the DTO:** email, country, home city, preferred currency, goals, and interests appear in no payload this ticket adds.
- [ ] An unknown handle answers 404. A provisioned-but-un-onboarded traveler answers 404 — the fixture is driven over HTTP without completing onboarding (no handle claimed), never planted with psql.
- [ ] The public stats read is a **new** service method; the owner's stats read is not reused, so the private trip count is structurally unreachable. Proof: a subject with private trips and nothing public shows `0 · 0`.
- [ ] The read requires authentication like every /v1 surface — signed-out answers the standard 401.
- [ ] The screen reuses the S4.21 profile components, parameterized by subject (the in-ticket prefactor). The own Profile tab renders exactly as before — its existing suite stays green with no assertion loosened.
- [ ] Two of the three deltas land: no cogwheel, and a two-cell stats row reading **Published · Postcards** per the S4.21 stats-cell anatomy.
- [ ] Self-view: navigating to my own handle — byline tap or direct address — lands on my own Profile tab; the public projection never renders for its owner. (Re-ruled 2026-08-25, C4 adopted — see the spec's Comments.)
- [ ] The Diary and Itineraries tabs render as shells with honest empty copy; the copy lives in a plain module both components and specs import.
- [ ] Both queries revalidate on focus via the shared helper; neither opens a socket subscription (the spec's freshness lane).
- [ ] The profile-view demand event joins register #2.

## Comments

**2026-08-25 — the design baseline is now the S4.36 canvas** (`mock-render.dc.html`, values in `public-profiles-mock-digest.md`), frames **1a/1b**: build the header row (back chevron in a 36px hit target + "Profile" 15/700 — new chrome for a pushed screen), the identity block per the digest, the two-cell stats row, and 1b's empty-state anatomy with its final copy. The bio row is omitted entirely when empty — no placeholder. The 404 state renders C7's copy: **"This profile isn't available"**. One pending founder ruling rode this ticket and was settled the same day: **C4 adopted, decision 9 superseded** — self redirects to the own Profile tab, and the public screen is strictly another-traveler UI (no self Edit affordance exists on it).

**2026-08-26 — the stats row is four cells again** *(founder, at the build review; recorded in full in the spec's Comments)*. Published · Postcards · **Followers · Following**, the last two rendering `—` until story B gives them real counts. The AC above reading *"a two-cell stats row"* is superseded; the reasoning under it is not — no stub metric reaches this surface, and `Trips` stays off the row because the owner's count includes private memberships. This is a delta from the canvas's C3, which draws two cells and says follower counts are not public; the founder's ground is that following ships next and the layout should not move twice.
