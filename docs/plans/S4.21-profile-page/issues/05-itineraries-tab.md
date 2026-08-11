# 05 — The Itineraries tab

**What to build:** The Itineraries tab renders the traveler's **published-and-owned** itineraries as showcase cards, served by a new additive traveler-scoped listing (the my-diary-trips precedent: resolved from the caller's token, reading only their own memberships), cursor-paged, carrying what the card draws: cover image, title, destinations, day count. Cards match the mock: cover with the price pill, title with the PUBLISHED badge, destinations · N days line, star row — where ★ (1.0–5.0, one decimal) and ₱ ("/ person", 10–20k hundreds) come from the stub-metrics module. Tapping a card opens the existing published view. Designed empty state when nothing qualifies. If ticket 03 chose to ride the counts on this listing, honor that shared shape. See [spec](../spec.md) decisions 2, 4, 5 and the wire-changes section.

**Blocked by:** 01 (the screen), 02 (the stub module).

**Status:** ready-for-agent

- [ ] Integration test at the controller seam, the discriminating case: owned-published trips returned; owned drafts and member-only published trips excluded; cursor paging works
- [ ] Cards render cover, title, PUBLISHED badge, destinations · N days per the mock; a missing cover renders a clean placeholder
- [ ] ★ and ₱ render stub values in their ruled ranges; with the switch off, muted star with no number and no price pill
- [ ] Card tap opens the published view; back returns to the profile with the tab still selected
- [ ] Empty state renders when the traveler owns nothing published
- [ ] Screen tests cover list rendering, empty state, and navigation

## Comments
