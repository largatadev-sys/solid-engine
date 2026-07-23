# 07/18 Figma mock — "Create and Publish an Itinerary from scratch" · digest

**What this is:** the complete design-bearing content of the founder's Figma CSS export (received 2026-07-23 at the S1.3 grilling as `css.txt`; the raw export can be dropped beside this file — this digest strips only the repeated auto-layout boilerplate and status-bar chrome). Canvas: 3283×1745 grey board, seven phone frames at 393×852 (iPhone-ish), Inter throughout.

**Disposition:** frames 1–4 are S1.3's (with greyed elements per the spec's grey-out map); frames 5–7 park to S4.1 (register #11). The panel and chrome inventories at the bottom park to their owning stories.

## Design language (input to the pre-E4 visual-direction decision — S1.3 uses existing tokens)

- Ink `#09090B` / `#111827` / `#121212` (inconsistent in the mock — a token job) · secondary text `#71717A` · placeholder `#B3B3B3` / `#888888` · borders `#E4E4E7` / `#EBEBEB` · field fill `#F4F4F5` · nav grey `#666666` · **accent orange `#FF751F`** (preview tabs only) · preview-banner amber `#FFF7ED`/`#FFEDD5`/`#C2410C`.
- Type: Inter; 28/800 page titles (create), 18/700 titles (schedules), 12/600 capitalized field labels, 14/400 field values, 13/16 card subtitles, 15/700 primary CTA text.
- Fields: 44px, fill `#F4F4F5`, 1px `#121212` border, radius 4 (radius 8 in the booking panel — another inconsistency). Primary CTA: 46px, `#09090B`, white 15/700. Cards: radius 12. Chips: pill radius 100.

## Frame 1 — `create-entry` (Trips tab) — *parked: chooser → S4.7; nav ships greyed*

- Header "Trips" 28/800.
- **Scratch_Card** (selected style: 2px `#09090B` border): file icon in white icon-wrapper · "Create Itinerary" 16/700 · "Your itinerary step by step from scratch" 13/400 grey.
- **Fork_Card** (layer named Fork_Card, content is *resume*): git-branch icon · "Nippon 2027 w/ besties" 16/700 grey · "Continue editing your Trip Workspace" 13/400.
- **Bottom nav**: Home (outline, `#666666`, 11/500) · Discover (search icon, 11/700) · **Trips (filled briefcase, black, active)** · Profile (outline, 11/500). Home-indicator bar.

## Frame 2 — `create-entry` (Create Itinerary form) — **S1.3, real**

Back chevron + "Create Itinerary" 28/800. Fields top-to-bottom:
1. **CoverPhoto** — 150px dashed `#E5E7EB` drop zone, dark pill button "Upload photo(s)/video(s)" 13/700 white on `#111827`. → *ships greyed (S3.3)*.
2. **Trip Title** — value shown "Island Hopping in El Nido".
3. Row: **Destination** (placeholder "Change…" — single-select look; canon keeps the `destinations` list, UI simplification only) + **Duration** ("5 Days" + chevron-down = a picker) — 229px/120px split.
4. **Best Time of year** — "Dec - Apr". → *not rendered (S4.1 metadata)*.
5. **Trip Description** — 108px multiline, "Discover the breathtaking beauty of El Nido's lagoons… Lez goo!" 14/150%.
6. **Trip Highlights (standouts)** — rows ("Big Lagoon Kayaking", "Local Seafood Dinners") with minus-remove; two more rows (`display:none` in export: "Sunset at Las Cabanas", "Hidden Beach Exploring"); "+ Add Highlight" 13/700. → *not rendered (S4.1; glossary term = Standout)*.
- Sticky footer CTA: **"Continue to Daily Schedules"**.

## Frame 3 — `edit-day-schedule` (empty day) — **S1.3, real**

- Back + "Daily Schedules" 18/700.
- **DayTabs** 56px bordered strip: chips **Day 1 (active: `#111111` fill, white 12/700)**, Day 2–5 (outline `#EBEBEB`, `#666666` 12/500) + **32px square `+` button** (add day; layer literally named "Filter Empty" with a hidden "Filter" label — reused component, ignore the name).
- **Day 1 Title** field — "Arrival & Sunsets" (per-day title — the fact that forced the Day entity, ADR-013).
- **"+ Add Activity"** — 48px dashed row, 14/700.
- Sticky footer CTA: **"Preview Itinerary"** → *ships disabled + graceful message (flow is S4.1's)*.

## Frame 4 — `add-edit-activity` ("Daily Activity") — **S1.3, real**

Back + "Daily Activity" 18/700. Fields:
1. **Activity Name** — "Airport Transfer".
2. Row (174.5px halves): **Time** (placeholder "00:00AM/PM") + **Estimated Cost** (placeholder "₱PHP").
3. **Location** — placeholder "Describe a specific place or landmark" (free text — confirmed as the v1 shape).
4. **Description** — 88px multiline, "Arrange a van transfer from Lio Airport to your hotel in El Nido town proper. Takes about 20 minutes."
5. **Notes & Creator Tips** — 88px multiline, "Book the earliest slot at 8:00 AM to avoid the large tour groups!" → *ships as private `notes`; the tips split is S4.1's*.
6. **Photos** — 80px dashed add-tile "+ Add Photo" + a filled 80px thumbnail. → *tile ships greyed (S3.3)*.
7. **Booking Integration** — 48px row "🔗 Add Booking Link / Option +". → *replaced by the single URL field; panel parked (E6)*.
- Sticky footer CTA: **"Save Activity"**.

### Booking panel (expanded, separate group on canvas) — *parked whole → E6 backlog*

Card `#F4F4F5`/`#E4E4E7` radius 12: header "PROVIDER 1" + trash (implies a list). Fields (radius 8): **Booking Purpose** ("River tour, restaurant reservation, etc.") · **Booking Provider** ("Klook, Expedia, Booking.com, etc.") · **Target URL** ("https://klook.com/activity/1243-el-nido-underground") · **Estimated Price** ("₱PHP") · CTA "Save".

## Frame 5 — `edit-day-schedule` (populated day) — **S1.3, real** (cards), minus parked bits

- Same header/tabs/day-title as frame 3.
- **Activity_Card** (radius 12, selected card has `#121212` border): **grip-vertical drag handle** (manual order — the fact that decided ordering authority) · meta line "**02:00 PM** • **₱500**" 12/700+600 grey · title "Airport Transfer" 15/700 · subtitle "Pick up at Lio Airport" 13/400 grey · **edit-2 + trash** icons 18px.
- Second card (`display:none` in export): "05:00 PM • **Free**" / "Sunset at Las Cabanas" / "Las Cabanas Beach" — the zero-cost display case.
- "+ Add Activity" dashed row below the cards · footer "Preview Itinerary".

## Frame 6 — `Itinerary_Preview` — *parked whole → S4.1 (register #11)*

- Amber banner: 👁 "This is a preview of your published itinerary."
- **PALAWAN** black pill + "5 Days" · creator row: avatar, "Jose Reyes" 14/700, "**@josetravels**" (handle — already ruled out of MVP) + **Follow** button (`display:none` — friend graph, backlogged).
- Title "Island Hopping in El Nido" 32/800.
- Stats card: "0.0 ★ / 0 Reviews" · "0 / Forked" · "**₱15k / Est. Cost/Person**" (the est-vs-actual register question).
- Tabs: **Overview (active, `#FF751F` underline + text)** · Day-by-Day · Comments (`display:none`) · Reviews (`display:none`).
- Photo gallery: 2×132px rows, rounded corners outer-only, last tile dark overlay "**+27**".
- Description 16/160% · **"Standouts"** header 16/700 with check-circle rows ("Big Lagoon Kayaking", "Local Seafood Dinners").
- Sticky footer: **"Publish Itinerary"** (black CTA) + "Continue Editing" (outline).

## Frame 7 — `published-success` — *parked whole → S4.1*

- 72px circle + party-popper icon · "Your Itinerary is Live!" 24/800 · "\"Island Hopping in El Nido\" is now available for travelers to discover and **fork**." · trip mini-card (64px thumb, "Palawan • 5 Days").
- "SHARE WITH TRAVELERS" 12/700 uppercase · **Copy Link** + **Share to...** buttons.
- CTAs: **"View Published Itinerary"** (black) · "Back to Feed" (outline — a feed that is E4's).

## Oddities preserved for the record

- Mock images are AI-generation prompts baked into `url(...)` filenames (e.g. "A realistic photograph of a sleek luxury van…") — placeholders, not assets.
- Border/radius values drift across frames (1px `#121212` vs `#E4E4E7`; radius 4 vs 6 vs 8) — the token layer, not the mock, is authoritative for S1.3.
- Minus/Plus icons annotated as Vaadin lumo components — icon-set noise, ignore.
- `₱` renders as `â±` in the raw export (encoding artifact); the intent is the peso sign.
