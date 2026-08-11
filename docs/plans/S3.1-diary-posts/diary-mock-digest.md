# Diary flow mock (founder CSS export, received 2026-08-11 at the S3.1/S3.4 grilling) · digest

**What this is:** the design-bearing content of the founder's Figma CSS export of the diary capture flow (`diary.txt`, four frames), received mid-grilling. Adopted as **design baseline** for S3.1's capture flow per the standing mock rule; boilerplate and status-bar chrome stripped, the S1.3/S1.4 digest discipline. A faithful HTML reconstruction is archived beside this file as `mock-render.html` (published to the founder as an artifact during the session; reconstructed text was flagged there and the load-bearing copy founder-approved — decision 7 of the spec).

**Dispositions, ruled at the grilling:** frames 3–4 are **S3.1's to build**. Frames 1–2's day-execution chrome (Start/Skip Day, locks, started-at stamps, progress bar, TRIP IN PROGRESS badge, the Notes tab row) is **backlogged whole** — only the per-activity Add to Diary links land now, on the shipped S4.17 viewer. Frame 2's Complete Trip sheet is the existing `ongoing → completed` transition's confirm, not a new mechanic. The Photo Dump as a picker source is **S3.4**.

## Design language

Consistent with the S4.13/S4.17 sets: Geist/Outfit/Inter/Figtree faces (render as app tokens, ADR-016) · ink `#1C1917` · muted `#78716C`/`#6B6661` · hairlines `#E7E5E4`/`#F1F0EC` · accent orange `#EA580C`/`#F97316` (links, CTAs, active tab) · success green `#15803D`/`#10B981` · card radius 12–16, CTA radius 4.

## Frame 1 · "Active/Ongoing workspace" (393×1234)

Workspace, mid-trip. Header: back chevron · **TRIP IN PROGRESS** badge (green `#15803D`, 11/700 uppercase) · **Edit Itinerary** + pencil (orange) · title "Island Hopping in El Nido" (Outfit 22/700) · "Original by Jose Reyes" (13, muted). Tab row: **Day-by-Day** (active, orange underline) · Polls · Travelers · **Notes** · Photo Dump — *no Chat, no Details* (disposition: rides the backlogged day-execution line).

Day list:
- **Day 1: Arrival at Sunset** — green check circle, collapsible (minus icon). Activities (title 13/600 · "time • place" 11 muted), each with a trailing link: "Airport pickup & private boat transfer / 2:30 PM • Bora Bora Airport" → **Added ✓** (green 12/700) · "Bungalow check-in / 4:00 PM • St. Regis Resort" → **Add to Diary** (orange 12/700) · "Sunset dinner on the beach / 7:00 PM • Lagoon Restaurant" → Add to Diary.
- **Day 2: Lagoon Exploration** — highlighted card (ink border, radius 16), orange arrow circle, **Skip Day** button (orange text), "Started at 8:30 AM" (11 muted). Activities: "Snorkeling with stingrays / 9:00 AM • Main Lagoon" → Add to Diary · "Coral garden boat tour / 1:30 PM • Coral Reef Sanctuary" → Added ✓ (a hidden `UP NEXT` badge exists in the export, `display:none`) · "Traditional dinner show / 6:30 PM • Otemanu Pavilion" → Add to Diary.
- **Day 3: Underground River** — lock circle + **Start Day** button (orange outline).
- **Days 4–5** — lock circles, muted titles, chevrons (collapsed).
- **Complete Trip** CTA (full-width, `#EA580C`, 53h).

Pinned bottom: progress panel — "**Day 2 in progress**" (15/700) · "**40% Completed**" (13/600 orange) · 8px track, orange fill at 40%. Bottom nav: Home · Discover · **Trips** (active) · Profile.

## Frame 2 · "Finalized workspace" (393×1234)

Same screen (Day 2 card without Skip Day) under a 40% scrim, with a bottom sheet (radius 24, handle): orange glow circle + check · **"Complete this trip?"** (22/800) · "This marks the end of your trip and lets your group know it's a wrap. This itinerary and all the details will be saved to your Completed Trips." (14, `#68615E`) · **Complete Trip** (orange, 52h) · **Cancel** (outline, `#68615E`).

## Frame 3 · "Add to Diary" (390×842, pushed screen)

Header: back chevron · **Add to Diary** (18/700). Body (gap 24):
- **Activity header**: eyebrow (12/700 uppercase, `#FF5A3C`) + title (24/800). *Text exported by role name only — reconstructed as day/time + activity title; the title inferred from Frame 4's copy ("Sunset at Las Cabanas").*
- **Device-photo section**: label (14/600, `#44403C`, ~28 chars — reconstructed "Select photos from your camera roll") · grid of 104×104 photo cards (radius 12) each with an orange `#FF5A3C` check badge top-right · dashed **Add More** tile (`#FAF9F5` bg, `#EBE9E2` dash).
- **Photo Dump section**: same anatomy; label ~19 chars — reconstructed "From the Photo Dump".
- **Caption**: label ~12 chars ("Add a caption") · textarea 80h (`#FAF9F5` bg, radius 4).
- **Info note**: info icon (`#FF5A3C`) + two lines 13/400 muted. *Copy not in the export; pinned at the grilling:* **"Only you can see your diary. It shows up on your profile."**
- **CTA**: **Add to Diary** (full-width, `#EA580C`, 54h, 16/700).

Photo tiles in the export are generative-prompt placeholders (sunset beach, golden waves, friends at sunset, market) — no real assets shipped with the mock.

## Frame 4 · "retro-success" (393×852)

Centered: green `#10B981` circle (64) with check · **"Activity Added!"** (Inter 32/700) · "**Sunset at Las Cabanas** is now part of your Diary." (14, `#6E6A66`). Bottom nav as Frame 1. The frame's own name — *retro* — read at the grilling as retrospective posting, confirmed by the founder's "once it is started" ruling (spec decision 5).
