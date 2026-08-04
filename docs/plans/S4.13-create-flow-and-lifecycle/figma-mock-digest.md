# S4.13 — Create-itinerary Figma set · digest

**Source:** the founder's CSS export of the final create-flow board (`itinerarycreation.txt`, 2026-08-04). Rendered frames + the 14-finding reconcile table: `https://claude.ai/code/artifact/bd670bbb-10d4-455f-8a23-155b35a9a0c6`. This digest is the archived design baseline for S4.13 (the S1.3/S4.9 discipline). **Where a ruling overrules the drawing, the ruling is noted inline — do not re-open the losing side as a missed detail.**

## Frames, in flow order (all 393px wide)

| # | Frame (export name) | Height | Role |
|---|---|---|---|
| 1 | `Trips landing` | 1011 | The Trips screen — the real design, not a placeholder |
| 2 | `create-entry` | 1031 | Trip-level fields |
| 3 | `edit-day-schedule` (empty) | 852 | Day tabs + empty day |
| 4 | `add-edit-activity` (+ `Add Booking Link/Option clicked` sub-frame, 361×426) | 988 | Activity form + booking card |
| 5 | `edit-day-schedule` (filled) | 852 | One activity placed |
| 6 | `Itinerary_Preview` | 1192 | The reader's view + terminal CTA |
| 7 | `published-success` | 852 | Success chrome — **re-homed to the publish act** (spec decision 11) |

The board's one connector runs Trips landing's CTA → `create-entry`.

## Visual language

- **Type:** Geist on frame 1 (weights 500–800; header 28/36 w800); Inter everywhere else (page titles 18/22 w700; `create-entry` title 28/34 w800; field labels 12/15 w600 capitalized `#71717A`; inputs 14/17 w400 `#09090B`, placeholders `#B3B3B3`/`#888`).
- **Fields:** `#F4F4F5` fill · `1px solid #121212` border · radius 4 (booking-card fields radius 8) · padding 12.
- **CTAs:** primary `#09090B` on white, radius 4–8, 46px, 15/18 w700; frame 1's Create Itinerary is `#F05A28`, 52px; outline CTAs `1px #E4E4E7`.
- **Cards:** trip card — white, `1px #F3F4F6`, radius 16, shadow `0 4 12 rgba(0,0,0,.04)`, 76px image radius 12; activity card — `1px #121212`, radius 8, grip-vertical + edit/trash `#71717A`.
- **Chips:** day tabs — active `#111` fill white text, inactive `1px #EBEBEB` `#666`; radius 100.
- **Accents:** preview tab underline `#FF751F` (pre-ADR-016 orange — token layer decides, not this hex); preview banner `#FFF7ED`/`#FFEDD5`/`#C2410C`; status dots `#D97706` amber / `#059669` green.
- **Icons:** named only (lucide-family: search, sliders-horizontal, chevron-*, grip-vertical, edit-2, trash, link, plus, minus, eye, copy, share-2, check-circle, party-popper; Iconly Home; Vaadin lumo plus/minus). **No `<symbol>` path data in this export** — unlike S4.9's; take paths from the named sets.
- All photography is generation prompts, not assets — media ships greyed (spec decision 9).

## Frame notes + rulings applied

**1 · Trips landing.** Status bar 44px Geist variant. Header "Trips" + search/sliders icons. Three sections drawn — *Ongoing / Draft / Completed*, 14/18 w700 capitalized `#4B5563`, gap 32 between sections, 12 between cards. Card anatomy: image · date 11/14 `#9CA3AF` · title 15/20 w700 · status-dot row · chevron (visibility varies per card in the export — fixture noise). CTAs: Create Itinerary (orange) + Add a Past Trip (outline). 4-tab nav: Home/Discover(search icon)/Trips(briefcase-fill, active)/Profile, 11px Inter labels. **Rulings:** four sections — `Upcoming` added, model-forced (decision 4) · status slot = lease advisory only, no publication badges (decision 4) · Add a Past Trip greyed (decision 6) · the drawn per-card dots ("Active" in Completed, "Draft" dot on Paris) are fixture noise, not intent.

**2 · create-entry.** Cover drop-zone 150px dashed `#E5E7EB` with dark upload pill ("Upload photo(s)/video(s)", 13 w700) — **greyed until S3.3**. Fields: Trip Title · Destination (drawn as picker, "Change…" — **overruled: free text, decision 12**) · Duration ("5 Days" dropdown, 120px — **creation-time sugar only, decision 8**) · Best Time of year · Trip Description (108px area) · "Trip Highlights (standouts)" list with minus-rows + "Add Highlight" — **labeled Standouts / "Add Standout", decision 13**. Footer dock: "Continue to Daily Schedules" in a bordered 78px bar.

**3/5 · edit-day-schedule.** Day chips row 56px bordered top+bottom, `+` square (32px, `1px #8F8F8F`) adds a day — **the only day-count editor after creation, decision 8**. Day N Title field. Dashed Add Activity row (48px). Filled state: activity card — time w700 · dot · cost 12/15 `#71717A`, title 15/18 w700, place 13/16. Footer CTA: "Preview Itinerary" (radius 8).

**4 · add-edit-activity.** Title "Daily Activity". Fields: Activity Name · Time + Estimated Cost (two-up, 174.5px each; placeholders "00:00AM/PM", "₱PHP" — export mojibakes ₱ as `â±`) · Location (free text, "Describe a specific place or landmark") · Description (88px) · Notes & Creator Tips (88px) · Photos (80px add-tile + thumbs — **greyed until S3.3**) · Booking Integration row (link icon + "Add Booking Link / Option" + plus). Sub-frame on tap: `#F4F4F5` card radius 12 — "PROVIDER 1" header + trash, fields Booking Purpose / Booking Provider / Target URL / Estimated Price (radius 8), Save CTA. **Rulings:** the card ships whole but **one per activity** — repeatability ("PROVIDER 1", add-another) overruled; semantics = what the traveler used (decision 7).

**6 · Itinerary_Preview.** Banner: eye icon + "This is a preview of your published itinerary." — **copy overruled, decision 10**. PALAWAN pill (black, radius 100) + "5 Days" (derived — decision 8). Byline: 40px avatar, name 14 w700, @handle 12 `#666`; Follow button drawn `display:none` (friend graph — stays out). H1 32/39 w800. Stats card (`1px #E4E4E4`, radius 8): "0.0 ★ / 0 Reviews" · "0 / Forked" · "₱15k / Est. Cost/Person" — **zeros ship as fact; label overruled to "Est. Cost", decision 10**. Tabs Overview (active, `#FF751F` underline) / Day-by-Day; Comments and Reviews drawn `display:none` (S4.6/S4.5). Photo gallery 2×132px rows, +27 overlay — **greyed until S3.3**. Description 16/160%. Standouts: check-circle `#B3B3B3` rows. Footer: **"Publish Itinerary"** black CTA + "Continue Editing" outline — **terminal CTA overruled: "Finish Planning" (`draft → upcoming`), decisions 1–2**.

**7 · published-success.** 72px `#F4F4F5` circle + party-popper 36px. "Your Itinerary is Live!" 24/29 w800; body: *"…is now available for travelers to discover and fork."* Trip mini-card (64px thumb). "SHARE WITH TRAVELERS" uppercase 12 w700 label; Copy Link + Share to… buttons (two-up, `#F4F4F5`). CTAs: "View Published Itinerary" + "Back to Feed". **Ruling: the whole frame re-homes to the publish act, untouched (decision 11)** — it fires when a `completed` trip publishes, never at creation's end.

## Export self-contradictions (recorded so nobody "fixes" toward them)

- Field border `#121212` at radius 4 on most frames, but the highlight rows and booking fields use `#E4E4E7`/radius 6–8 in their `display:none` variants — the visible-state values are the baseline.
- Frame 1's Completed section carries a green "Active" dot and an amber "Draft" dot on cards *inside Completed* — fixture noise; sections carry state (decision 4).
- Two different status-bar treatments (Geist 14px on frame 1; Inter 16px elsewhere) — platform chrome, not design intent.
- The day-tab row is labeled `filter-chips`/`chip-all`/`Filter Empty` in the export — leftover component names from a filter pattern; they are day tabs.
