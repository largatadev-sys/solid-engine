# Handoff: Diaries & Postcards (CM-2)

## Overview
Story CM-2: travelers post **Diaries** (a told journey: title, destination, cover, dates, made of Days holding Postcards) and **Postcards** (1–5 photos, caption, optional place) on their own, with or without a trip. This bundle covers the compose flow, the profile Diary tab, diary and postcard detail, add-to-diary, and confirms. Feed and Trip-workspace changes (frames I, J in the brief) are **out of scope** and move to a separate story; one decision is carried over (see Decisions).

Repo context: `mobile/` (React Native, iOS-first, 393pt frames). Existing copy lives in `src/diary/diaryCopy.ts`; existing postcard helpers in `src/diary/postcardAnatomy.ts` and `src/feed/feedCardAnatomy.ts`.

## About the Design Files
`Diaries & Postcards CM-2 Screens.dc.html` is a **design reference built in HTML** (open it in a browser; `support.js` must sit beside it). It is not production code. Recreate every screen in the React Native codebase using its existing components (`ScreenHeader`, `FormField`, `Button`, `DatePicker`, `ConfirmStation`, `SelectableChip`, `Avatar`, etc.) and patterns. Five frames on the canvas are live (2b, 3, 5, 6/7, H2) so motion and state can be inspected in the browser.

## Fidelity
**High-fidelity.** Colors, type, spacing, radii, copy and motion timings are final. Match them exactly. Where a value below conflicts with the export's visual system, the visual system wins.

## The model (server-owned; screens only render it)
- Trip → Day → Activity is planning. Diary → Day → Postcard is telling. Nothing here changes trips or itineraries.
- A Diary is public (to whoever the author's profile admits) from the moment it exists. No draft state.
- Days are derived server-side from the diary's dates. The client never computes a date, ordinal or count. A skipped day has no row.
- Postcards are loose (no diary) or on a day. A loose postcard can be added to a day later (move, not copy). Nothing moves between diaries or days.
- Deleting a diary deletes its postcards (confirm shows the server count). Deleting a postcard leaves the diary. Deleting a day deletes its postcards.
- No likes, comments, reactions, hearts or counts anywhere. Remove every engagement affordance from these surfaces.
- Vocabulary: Diary, Day, Postcard. The word "entry" never appears in UI copy (see `diaryCopy.ts` — several strings there use "entry"; replace on these surfaces).

## Decisions made in this pass (changes vs. the brief / first pass)
1. **Compose headers** (2, 2b, 3, 4, D, E, F): no "Cancel" text button. A `<` back button (36×36, chevron 22px #1C1917) sits left with the DIARY/POSTCARD pill on the same row; title on the next line. Back on 3 triggers L4.
2. **Date picker** (2b): one calendar, flight-booking style range. Tap start, tap end; tap on/before start restarts. Start/End chips above the grid show which is being set. Future dates disabled. Same component single-date for E; F reuses it for range.
3. **Photo picker** (A): **not designed** — use the native iOS picker (PHPicker) with `selectionLimit: 5`, images only, ordered selection. "Add photo" tiles in 3/D/4 open it.
4. **Profile stats** read Diaries · Itineraries · Followers · Following (was Entries). Diaries counts diaries; postcards don't change it.
5. **Empty Diary tab** (K1): icon + "Nothing posted yet" + one line. No Post button (the ⊕ in the header is the entry point).
6. **Diary detail** (B, C) and **postcard detail** (G1, G2): no DIARY/POSTCARD pill in the header.
7. **Add-to-diary picker** (H1) with many diaries: sheet grows to ~70% of the screen then scrolls internally; Cancel pinned; most recently updated first; 8+ diaries adds a search field; one diary skips straight to H2; zero shows "No diaries yet" + "New Diary" row.
8. **Meta line for a postcard with no activity** (M): `Day N · Mar 15` (no time). Bold line = place when set; otherwise no bold line and the caption follows directly.
9. **Settled labels on 3**: photo section "Photos" with an "N of 5" counter, caption "What happened?", add tile "Add photo". Hint "You can skip days you don't remember." is pinned above the Post CTA.
10. **Feed (deferred story)**: the feed card's "Trip Post" badge becomes "View diary" / "View postcard", linking to C or G2. No feed frames in this bundle.
11. Removed everything the brief marked as not-ours: hearts, comment icons, engagement rows, "entry" wording.

## Screens
All phone frames are 393pt wide, white (#FFFFFF), status bar 44pt (Geist 600/14 "9:41"), home indicator 134×5 #1C1917. Frame ids on the canvas: `#f1`, `#f2`, `#f2b`, `#f3`, `#f4`, `#f5`, `#f6`, `#f7`, `#fK1`–`#fK3`, `#fB`–`#fF`, `#fG1`, `#fG2`, `#fH1`, `#fH2`, `#fM`, `#fL1`–`#fL4`.

### 1 · Post sheet (profile ⊕)
Bottom sheet over the profile. Scrim rgba(28,25,23,.45). Sheet: white, radius 20/20/0/0, padding 10/20/0, grabber 36×4 #E7E5E4. Title "Post" Outfit 700/22. Two rows (padding 14/0, divider #EFEBE4): 44×44 icon tile radius 12 (#FFF7ED w/ #EA580C book icon; #F0EBFF w/ #5B3BFF postcard icon), label DM Sans 600/16 #1C1917 ("A Diary" / "A Postcard"), sub Geist 400/13 #78716C ("Share your past travel memories" / "Send a quick travel update"), chevron 16px #A19B95. Press: 60% opacity.

### 2 · Diary setup ("New Diary")
Header row: back button + DIARY pill (Geist 700/11, letter-spacing .6, #5B3BFF on #F0EBFF, padding 4/8, radius 6). Title Outfit 700/22; subtitle Geist 400/13 #78716C "Tell a trip you already took. Days come next." Fields (label DM Sans 600/14 #1B263B, required mark #EA580C; input 48pt, border 1 #E7E5E4, radius 10, padding 0/14, DM Sans 400/15 #1C1917, placeholder #A19B95): Title*, Destination ("Where did you go?"), Cover (120pt dashed 1.5 #E2E4E8 radius 12 bg #FAF9F5, "Tap to add cover"), "When was this?*" as two 48pt chips (Start / End caption Geist 600/11 uppercase #A19B95). CTA "Next: Add Your Days" 50pt #F05A28 radius 4 DM Sans 600/16 white, 16pt side margins.

### 2b · Date range picker (live)
Bottom sheet. Title "When was this?" Outfit 700/22. Two chips (48pt, radius 10): active one has 1.5pt #EA580C border and #EA580C caption; text DM Sans 400/15. Month row: chevrons 20px, "March 2026" DM Sans 600/16. Weekday row Geist 600/11 #A19B95. Day cells 40pt tall, 7 columns, row gap 6; number DM Sans 400/15. Start/End: 40×40 circle #EA580C, white 600 text. Between: #FFF0E6 band (start cell is half-band right, end cell half-band left). Disabled (future) dates #D6D3D1, not tappable. Summary line Geist 400/13 #78716C ("6 days" / "Now pick the end date"). Done CTA #F05A28; disabled #F5C4AE with no press.

### 3 · Diary days (live)
Header: back + DIARY pill. Title = diary title Outfit 700/22; subtitle "Fill in the spots you remember from each day". One card per server day (border 1 #E7E5E4, radius 12, padding 14, gap 12): "Day 1: Mar 15" Outfit 700/16; "Where were you?" 44pt input with pin icon; "Photos" label + "N of 5" (Geist 400/12 #A19B95) + 3-col grid gap 8 of square tiles radius 12, selected check 22×22 #FF5A3C circle with 2pt white border top-right, dashed add tile "Add photo" (DM Sans 500/12 #78716C) which disappears at 5; "What happened?" textarea min 72pt DM Sans 400/15. Below the scroll region, pinned: "You can skip days you don't remember." Geist 400/13 #78716C centered, then Post CTA.

### 4 · Postcard compose ("New Postcard")
Header: back + POSTCARD pill. Title Outfit 700/22. Horizontal strip of chosen photos 200×200 radius 12 gap 8 (bleeds to edges). "Caption" textarea min 96pt. "Where were you?" 48pt input with pin. Post CTA.

### 5 · Profile Diary tab (live)
Profile header (Inter): "Profile" 700/15 + ⊕ and ≡ icon buttons 36×36. Avatar 72 #FDE4CF initials 700/22 #C2410C; name 800/22; handle 400/13 #78716C; bio 13.5 #44403C. Stats grid 4 cols, border 1 #E7E5E4 radius 14, padding 10/0, dividers #F5F5F4; value 700/16, label 400/11 #78716C: Diaries · Itineraries · Followers · Following. Tabs Diary | Itineraries: Geist 700/14 #EA580C active with 3pt bar radius 100/100/0/0, inactive 500/14 #78716C. Body Figtree, padding 16, gap 12:
- **Loose postcard card** (above sections): border 1 #EFEBE4 radius 12; photo 220pt with "1/3" pill (rgba(0,0,0,.5), Figtree 700/11 white); body padding 12/14: caption 400/14 #1C1917 + kebab 18px #78716C; meta row 400/12 #78716C: pin + place · time. No engagement row.
- **Diary section**: header row padding 12: thumb 44 radius 8, title 700/15, "destination • N days" 400/12 #78716C, orange "View itinerary →" 600/12 #EA580C **only when the section's trip has a published itinerary**, kebab, chevron (32×32 hit area, rotates 180° when collapsed). Postcards flat inside: divider #EFEBE4, padding 12, "Day N" 600/12 #78716C, photo 180pt radius 8, caption 400/14.
Bottom nav (Inter 500/11, icons 22px stroke 1.8): Home, Discover, Trips, Profile; active #EA580C, inactive #78716C.

### 6 · After posting a diary
Toast at top 52pt, 16pt side margins: #D1FAE5, radius 10, padding 12/14, check icon + "Diary posted!" Figtree 600/14 #054D38, shadow 0 8 24 rgba(5,77,56,.15). New section expanded at the top; loose cards drop below. Diaries stat 3 → 4.

### 7 · After posting a postcard
Same toast "Postcard posted!". Loose card at top; with no place the meta row is just "now". Diaries stat unchanged.

### K1 · Diary tab empty
48×48 circle #FFF7ED with book icon #EA580C; "Nothing posted yet" Figtree 700/15; "Tell a past trip as a Diary, or send a Postcard from wherever you are." 400/13 #78716C, centered, 40pt side padding. No button.

### K2 · Kebab on a section / K3 · Kebab on a loose card
Sheet (M1) with a small context label (Figtree 600/12 #78716C: diary title / "Postcard"), rows DM Sans 600/16 with 20px icons: K2 "Edit diary", "Delete diary" (#B91C1C); K3 "Edit caption", "Add to diary" (loose only), "Delete" (#B91C1C). Cancel 48pt #FAF9F5 radius 10.

### B · Diary detail — owner
Cover 260pt with light status bar, 36×36 rgba(28,25,23,.45) round back and kebab buttons at top 48; bottom gradient rgba(28,25,23,0→.7) with title Outfit 700/22 white and "Portugal • 6 days · Mar 15–20, 2026" Geist 400/13 rgba(255,255,255,.85). Author row padding 12/20, 28 avatar, Figtree 13 "**Mara Ellis** · @maraellis", border-bottom #EFEBE4. Days: header "Day 1" Outfit 700/16 + "Mar 15 · Alfama, Lisbon" Geist 400/13 #78716C, right "+ Postcard" Figtree 600/12 #EA580C; postcards photo 200pt radius 12 + caption 400/14; empty day shows a dashed 1.5 #E2E4E8 box "No postcards on this day" #A19B95. Footer "Add a day" 44pt outlined button radius 10 DM Sans 600/14. Kebab → K2 sheet.

### C · Diary detail — visitor
Same, minus kebab, "+ Postcard", "Add a day". Author row is tappable (chevron) → profile. Empty day is a plain #A19B95 line.

### D · Add a postcard to an existing day
Header back + POSTCARD pill; title "Day 2: Mar 16" Outfit 700/22; subtitle diary title. One card identical to a 3-card (place, Photos grid, "What happened?"). Post CTA.

### E · Add a day
Header back + DIARY pill; title "Day 7" (server ordinal); subtitle "Lisbon & the Algarve · after Day 6, Mar 20". Fields: Date* (48pt with calendar icon, opens 2b in single-date mode), "Where were you?". CTA "Add Day".

### F · Edit diary
Header back + DIARY pill; title "Edit Diary". Title*, Destination, Cover (120pt image with "Change" pill rgba(28,25,23,.6) bottom-right), "When was this?*" chips + helper "Changing dates doesn't add or remove days." CTA "Save".

### G1 · Postcard detail — owner (loose), kebab open
Top bar: back left, kebab right (no pill). Photo 393×393 with "1/3" pill top-right and 6px dots bottom-center (active white, others 50%). Body Figtree padding 14/16: caption 400/15 line-height 1.45; place row 400/13 #78716C with pin; divider; author row 28 avatar, name 700/13, "Posted Sep 6, 2026" 400/12 #78716C. Sheet rows: Edit caption · Add to diary (loose only) · Delete (#B91C1C) · Cancel.

### G2 · Postcard detail — visitor, on a diary day
No kebab. Between place and author: **diary row** (bg #FAF9F5, border #EBE9E2, radius 10, padding 10/12): book icon #EA580C, diary title 700/13, "Day 1 · Mar 15" 400/12 #78716C, chevron → C scrolled to that day. Loose postcards have no diary row.

### H1 · Add to diary — choose a diary
Sheet. Title "Add to diary" Outfit 700/22; "Step 1 of 2 · Which diary?" Geist 400/13. Rows padding 12/0, divider #EFEBE4: thumb 44 radius 8, title Figtree 700/15, "destination • N days" 400/12, chevron. Behavior per Decision 7.

### H2 · Add to diary — choose a day (live)
Sheet. Back chevron + diary title Outfit 700/22 + "Step 2 of 2 · Which day?". Rows: "Day N" Outfit 700/15 + meta Geist 400/13 #78716C; right side shows "N postcards" #A19B95 or, when selected, the 22×22 #FF5A3C check; selected row bg #FFF7ED (full-bleed). CTA "Add to Day N" #F05A28.

### M · Meta line, postcard with no activity
Eyebrow Figtree 700/11 uppercase letter-spacing 1 #EA580C: `DAY 1 · MAR 15`. Bold line 700/16 #1C1917 = place when set; otherwise omitted and caption (400/14) follows.

### L1–L4 · Confirms
Scrim rgba(28,25,23,.55). Dialog 300pt wide, white, radius 16, padding 20/20/16, shadow 0 24 60 rgba(28,25,23,.35). Title Outfit 700/18; body Geist 400/13 #78716C line-height 1.5; two 44pt buttons radius 4, DM Sans 600/15: left #FAF9F5/#1C1917, right #B91C1C/white.
- L1 "Delete this diary and its 12 postcards?" — "Lisbon & the Algarve and everything in it will be gone. This can't be undone." Cancel / Delete
- L2 "Delete this postcard?" — "Its photos and caption will be gone. The diary stays." Cancel / Delete
- L3 "Delete Day 3 and its 2 postcards?" — "Mar 17 · Sintra. The other days keep their numbers." Cancel / Delete
- L4 "Discard this diary?" — "Lisbon & the Algarve was created when you tapped Next. Discarding deletes it and any days you filled in." Keep editing / Discard
Counts come from the server payload already on screen.

## Contracts (client → server)
**C1 — Create a diary is two acts.** "Next: Add Your Days" blocks (spinner on CTA, fields locked) until the server returns the diary id and candidate days; no optimistic days. Failure: form stays filled, inline error under the CTA "Couldn't create the diary. Try again.", nothing created. On 3, each day card saves as its own act when the user leaves it with ≥1 photo; "Post" submits whatever is unsaved and returns to the profile with the 6 toast. Days with no photos are never sent. Back → L4; Discard deletes diary + saved days in one act.

**C2 — Post a postcard.** Photos upload on pick (progress ring on the tile, check at 100%). Post disabled until all picks landed and caption non-empty or place set. One act with caption, place, uploaded ids. Success: pop compose, land on Diary tab, 7 toast, new card fades in 200 ms at top. Failure: stay, dark toast "Couldn't post. Your postcard is still here." For D: return to B with the day expanded and the new postcard washed #FFF7ED fading over 1 s.

**C3 — Deletes are confirmed, then optimistic.** Kebab → sheet → confirm (L1–L3). On Delete the row/section exits immediately (M4), the stat decrements, request fires. Failure: row re-enters in place (200 ms fade), stat restores, dark toast "Couldn't delete. Try again." No second confirm. Deleting a diary from B pops to the profile first, then plays the exit there. Deleting the last of everything → K1.

**C4 — Add to diary moves, never copies.** H1 lists server diaries (most recently updated first); H2 lists that diary's days. CTA sends postcard id + day id; client does no duplicate/limit checks. Success: sheet out (M1), loose card exits (M4), target section grows by one, toast "Added to <diary title>". Failure: sheet stays, inline "Couldn't add it. Try again." Edits (G1 caption, F fields, E place) save on the CTA, not on blur; Back with unsaved changes asks "Discard changes?" with the L4 anatomy.

## Motion
- **M1 Sheets**: scrim fade 200 ms; sheet translateY 100%→0 260 ms cubic-bezier(.2,.8,.2,1). Out: 200 ms ease-in, scrim with it. Scrim tap, Cancel, or a row dismiss.
- **M2 Toasts**: in 220 ms ease, translateY(−12→0) + fade; hold 2000 ms; out 180 ms fade + translateY(−8). Success #D1FAE5/#054D38; failure #1C1917/#FFF. One at a time; new replaces current.
- **M3 Confirms**: scrim 180 ms; dialog scale .96→1 + fade 180 ms ease-out; out 140 ms fade.
- **M4 Row/section exit + enter**: exit 220 ms opacity→0, translateY(6), height→0 (siblings slide). Enter 200 ms opacity 0→1, scale .92→1. Section collapse uses enter for the body; chevron rotates 180° / 200 ms.
- **M5 Selection**: check badge scale .5→1.12→1 over 220 ms cubic-bezier(.2,.9,.3,1.3). Calendar dots fill 120 ms, band 160 ms, chip outline 160 ms.
- **M6 Press**: filled CTAs scale .98 / 120 ms; round icon buttons .92; sheet and list rows 60% opacity, no scale; disabled CTAs #F5C4AE, no press. Honour Reduce Motion (durations → ~1 ms).

## State
Per screen: compose form values; upload progress per photo; calendar `{start, end}` (end null while picking); section `collapsed` map; sheet/confirm/toast visibility; optimistic-delete pending set with revert payloads; selected day id in H2. All counts, ordinals, dates and card types are read from server payloads.

## Design tokens
Type — screen titles Outfit 700/22 · form labels DM Sans 600/14 · inputs DM Sans 400/15 · CTAs DM Sans 600/16 · subtitles/section labels Geist 400/13, 600/14 · cards/feed Figtree · profile header + bottom nav Inter.
Colors — ink #1C1917 · body #1B263B · muted #78716C · secondary #6E6A66 · placeholder #A19B95 · primary #EA580C · CTA fill #F05A28 · CTA disabled #F5C4AE · badge #5B3BFF on #F0EBFF · borders #EFEBE4 #E7E5E4 #E2E4E8 #EBE9E2 · surface #FAF9F5 · selection tint #FFF7ED / #FFF0E6 · toast #D1FAE5 text #054D38 · selected check #FF5A3C · destructive #B91C1C · scrim rgba(28,25,23,.45) sheets / .55 dialogs.
Radii — inputs 10 · cards 12 · CTAs 4 · pills 999 · sheets 20 · dialogs 16 · phone-frame chrome n/a.
Spacing — screen side padding 16 (compose) / 20 (profile header); card padding 12–14; field gap 20; card gap 12–16.

## Assets
Icons are inline SVG strokes (1.8–2.2) in the reference; map to the app's `Icon` component (book, postcard, pin, plus, chevron, kebab, pencil, trash, check, calendar, home, search, trips, person). Photos are gradient placeholders; use real imagery. Avatars are initials on #FDE4CF.

## Files
- `Diaries & Postcards CM-2 Screens.dc.html` — full canvas: frames 1–7, B–M, L1–L4, contracts C1–C4, motion M1–M6 (open with `support.js` alongside).
- `support.js` — runtime for the reference file.

---

*Archived 2026-09-06 from the founder's Claude Design handoff. The three files were reconstructed from the pasted bundle with the UTF-8 punctuation repaired (the paste arrived with the multi-byte glyphs mangled); if the original export folder is at hand, overwriting these three with it is the byte-exact baseline.*
