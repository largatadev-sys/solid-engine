# S4.17 — workspace mock digest *(the founder's 08/08 CSS export: `workspace.txt`, `add edit activity.txt`; rendered 1:1 in `mock-render.html`)*

The mock set is the **design baseline** (CLAUDE.md mock rule). Eight frames. This digest records each frame's load-bearing values, the mock's internal disagreements, and the founder rulings that resolve them — so the build reads one document instead of re-deriving the export.

## Frames

### 1 · `workspace-draft` — the Draft Workspace (editor), Day 1 expanded
- **Chrome:** status bar 44px · header (12px 16px 8px, gap 12): back chevron + amber badge **"Draft TRIP Workspace"** (bg `#FEF3C7`, border `#D97706`, radius 999, 11px Geist 700 uppercase) + right text-button **"Invite Traveler"** (13px Geist 700 `#EA580C`, user-plus 14px) · title "Island Hopping in El Nido" (Outfit 700 22/28 `#1C1917`) with a **hidden edit pencil** (`display:none` in the export — un-hidden by ruling, see Q7 of the grilling) · subtitle "Original by Jose Reyes" (13px Geist 400 `#78716C`).
- **Tab row** (43px, border-bottom `#E7E5E4`, gap 12): Day-by-Day active (14px Geist 700 `#EA580C`, 3px bar radius `100px 100px 0 0`) · Polls · Travelers · Notes · Photo Dump inactive (Geist 500 `#78716C`).
- **Expanded day card** (border `#E7E5E4`, radius 12): title row "Day 1: Lagoon Tour A" (Outfit 700 18/23) + **minus** collapse icon inline after the text (gap 8) · divider · activity rows (padding 12, gap 12, radius 12, 60px): **grip handle** 16px `#78716C` · name (Geist 600 14) + time "09:00 AM" (Geist 400 12 `#78716C`) · pencil-square + trash 16px `#EA580C`, gap 10.
- **Add Activity** CTA: outlined `#EA580C`, radius 12, text-then-plus (plus stroke 3).
- **Collapsed day stubs** (radius 12, padding 16): Outfit 700 16 title + chevron 18px `#78716C`.
- **"Add a Day"**: right-aligned text button, 13px Geist 700 `#EA580C` + calendar-plus 16px.
- **CTA rail**: Finalize Itinerary (solid `#EA580C`, **radius 4**, 53px, Geist 700 16 white) above Save Changes (border `#ECE8E5`, radius 4, 50px, Geist 700 14 black).
- **Bottom nav**: Home · Discover · **Trips active** (briefcase filled, black, Inter 700 11) · Profile; home indicator 139×5.

### 2 · `workspace-draft` + finalize sheet
Same screen with the CTA order **swapped** (Save Changes first, border `#000`) under a 40% black overlay and a bottom sheet (radius 24 24 0 0, shadow `0 -8px 24px rgba(0,0,0,.15)`): grabber 36×5 · 72px ring `rgba(255,107,53,.10)` around a 56px `#FF6B35` disc with a white check (stroke 3) · **"Ready to go?"** (Inter 800 22, center) · body *"Once finalized, the itinerary will be locked for your group to follow. You can always switch back to editing later."* (Inter 400 14/21 `#68615E`) · **Finalize** (bg `#FF6B35`, shadow, 52px, Inter 700 16) · **Keep Editing** (border 1.5 `#ECE8E5`, Inter 600 16 `#68615E`).

### 3 · `Finalized workspace` — the Trip Workspace (viewer), Ready state
Header: back + green badge **"Ready"** (bg `#DCFCE7`, border/text `#15803D`) + right text-button **"Edit Itinerary"** (pencil-square 16px). Same title block + tab row (Day-by-Day active). Body: **five collapsed day stubs** (Day 1: Arrival at Sunset … Day 5: Beach Relaxation) + **Start Trip** (solid `#EA580C`, radius 4, 53px) under 8px top padding. Same bottom nav. No Save/Finalize rail, no Invite Traveler.

### 4 · `add-activity` (390px frame)
Header: back + title **"Add Activity"** (Outfit 700 22). Form (padding 16 20 32, gap 20), field pattern: label Inter 600 16 capitalize `#000` · input 48px, border 1px `#757575`, **radius 4**, padding 14 · placeholder Geist 400 15 `#A59E99` · leading icon 18px `#EA580C`. Fields: Activity name ("e.g. Big Lagoon Kayaking") · Time (clock, "09:00 AM") · Location / Venue (map-pin, "Search for a place...") · Estimated Price (**map-pin + "Search for a place..." — an export slip, ruled corrected**) · Booking Link *(Optional — italic Inter 400 14 `#71717A`)* (link-45deg, "Paste booking URL here..."). CTA rail: **Save Activity** (solid, radius 4) + secondary reading **"Save Changes"** (**slip, ruled → "Cancel"**).

### 5 · `edit-activity`
Same form, filled (values Geist 500 15 `#1C1917`); the name input **focused**: border 1.5px `#E8613A`. Time "09:20 AM" · Location "Big Lagoon, Miniloc Island, El Nido" · Estimated Price repeats the location string (**the same slip**) · Booking Link "https://klook.com/mamamo/1234". Secondary CTA: **"Discard Changes"**.

### 6 · `Add Booking Link/Option clicked` — provider card *(E6 input, not built here)*
361×426 card, bg `#F4F4F5`, border `#E4E4E7`, radius 12: "PROVIDER 1" + trash · fields (label Inter 600 12 `#71717A`; input border `#121212`, radius 8): Booking Purpose · Booking Provider · Target URL · Estimated Price ("₱PHP") · black **Save**. **Founder: "ignore this screen for now"** — archived as E6 input; the numbering ("1") is the parked multi-option list.

### 7–8 · `workspace-voting`, `create-poll` — **parked (E2)**
Rendered in `mock-render.html` for the record; not built this story. Notable for later: the Polls tab active state, "ACTIVE POLLS" label right-aligned (export's `align-items:flex-end`), option cards with radio + avatar votes rows, "Voting Progress 5 of 6", winner cards with star + green "Added to Itinerary", the black Create Poll/Cancel pair, and the `create-poll` frame's **missing bottom nav**.

## The export's internal disagreements, and the rulings

| Disagreement | Ruling |
|---|---|
| Estimated Price field drawn as a location field (map-pin icon, "Search for a place..." placeholder, location value) | **Corrected**: a price input with a currency affordance (the provider card's own "₱PHP" shows the intent) |
| Add screen's secondary CTA "Save Changes" vs Edit's "Discard Changes" | **Corrected**: "Cancel" on Add |
| Finalize sheet in `#FF6B35` + Inter vs the system's `#EA580C` + Geist/Outfit | **Normalized** to `#EA580C` + the app families |
| CTA order flips between the two draft frames (Finalize-first `#ECE8E5`-border vs Save-first black-border) | Frame 1 (resting state) wins: **Finalize above Save Changes**, `#ECE8E5` border |
| Mojibake (`â¢`, `â±PHP`) | `•`, `₱PHP` |
| Notes tab drawn | **Cut** (founder) — Chat and Details join instead (neither drawn; deliberate additions) |

## What the mock does not draw (named deviations, founder-approved at the grilling)

Chat + Details tabs · greyed states for Polls/Photo Dump/Chat · the day-delete affordance in the expanded day header · Ongoing/Completed badges and the "Step back" link on the viewer · the "being edited by …" state of Edit Itinerary · empty states (day with no activities → just Add Activity; trip with no days → just Add a Day).
