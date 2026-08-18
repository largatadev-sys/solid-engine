# 07 — Home feed, profile, tab bar

**What to build:** The living `drive-home`, `drive-profile` and `drive-tab-bar` walks ported. The feed's real product poll cycle stays real — it now overlaps other workers instead of blocking a serial run. The profile spec takes an **exclusive** identity from the map: it mutates traveler-level state.

**Blocked by:** 01 — Foundation + the discovery pilot.

**Status:** ready-for-agent

- [ ] The home spec covers what its walk covered, including the ~68-second product poll cycle — kept as a genuine wait on the product's behaviour, not shortened by a test hook
- [ ] The profile spec covers what its walk covered (header, stats, tabs, avatar) and signs in as an identity the map reserves exclusively for it
- [ ] The tab-bar spec covers what its walk covered (tabs present, routes land, no dead clicks)
- [ ] The feed spec asserts shape and caps, never global uniqueness, on the accumulating local database
- [ ] `drive-home.js`, `drive-profile.js` and `drive-tab-bar.js` are deleted
