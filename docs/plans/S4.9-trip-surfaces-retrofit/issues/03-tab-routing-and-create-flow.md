# 03 — Tab-group routing + the create flow (mobile)

**Status:** implemented — closed on the local rig at ticket 06

**What to build:** the navigation frame and the front half of the mock's flow. Expo-router restructures into a tab group — **Trips / + / Profile** live, **Home** and **Search** present but greyed (`comingSoon` + a register-#2 analytics event each) until S4.3 fills them; the app opens on Trips. The **+** routes straight to Trip Details (no chooser until S4.7 — spec decision 13). The create form becomes the mock's: title · single free-text destination field (placeholder without the word "Search") · duration · description · a greyed cover drop-zone (S3.3) — **no date fields**. Continue creates the trip (destinations as a list of one; duration seeds days, shipped behavior) and lands on the day editor at Day 1.

**Blocked by:** — *(independent of 01/02: the create API already accepts optional dates and duration)*

- [x] The app opens on Trips; the tab bar renders on top-level screens; Home and Search grey with `comingSoon` + analytics, dead-clicking nowhere on web (spec ACs 11, 12)
- [x] + lands on Trip Details; Continue with title + duration lands on the day editor at Day 1 with the seeded days (spec AC 12)
- [x] The create form has no date fields; dates remain editable from the trip's Details tab (spec decision 13)
- [x] Destination is one free-text input submitting a list of one; the Details edit surface keeps the full multi-destination list
- [x] The cover drop-zone renders greyed with `comingSoon` + analytics (spec AC 11)
- [x] Existing deep links (`largata://itineraries/<id>` and friends) still resolve inside the new tab structure

## Comments
