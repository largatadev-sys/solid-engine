# CM-2 — the design prompt

The complete prompt handed to the founder on 2026-09-05 for Claude Design. Its output — the finished frame set — is the archived baseline under `mocks/`; the Figma export it extends is not. Every act it names is a backend act from `grilling.md`'s contract seed; the screens render them and add none.

---

```
PROJECT
Largata is a travel app (React Native, iOS-first frames at 393pt wide with the iOS status bar and
home indicator). This set covers one story, CM-2: travelers post Diaries and Postcards on their
own, with or without a trip. Attached: the Figma export of the first pass (7 frames). Keep its
visual system exactly and extend it; do not restyle.

VISUAL SYSTEM (from the export)
Type: screen titles Outfit 700/22 · form labels DM Sans 600/14 · inputs DM Sans 400/15 · CTAs
DM Sans 600/16 · subtitles and section labels Geist 400/13 and 600/14 · cards and feed Figtree ·
profile header and bottom nav Inter.
Colors: ink #1C1917 · body #1B263B · muted #78716C · secondary #6E6A66 · placeholder #A19B95 ·
primary #EA580C · setup CTA fill #F05A28 · badge #5B3BFF on #F0EBFF · borders #EFEBE4 #E7E5E4
#E2E4E8 #EBE9E2 · surface #FAF9F5 · toast #D1FAE5 with text #054D38 · selected-check #FF5A3C.
Radii: inputs 10 · cards 12 · CTAs 4 · pills 999. Bottom nav: Home, Discover, Trips, Profile.
Deliverable: every frame as its own HTML/CSS with icons as <symbol> defs, in light content plus
the empty or error state where one exists.

THE MODEL — the backend defines it; the screens only render it
- Trip → Day → Activity is planning. Diary → Day → Postcard is telling. Itinerary is a trip's
  published face. Nothing in this set changes trips or itineraries.
- A Diary is one traveler's telling of a journey: title, destination, cover, dates, made of
  Days, each holding Postcards. Standalone diaries come from the setup flow and belong to no
  trip; no trip is ever created. Derived diaries appear automatically when a traveler posts
  from a real trip. A diary is public (to whoever the author's profile visibility admits) from
  the moment it exists; it is a living collection with no draft state.
- A Day is an ordinal, a date and a place ("Where were you?"). Many postcards per day. The
  server derives days from the diary's dates; the client never computes a date. A skipped day
  has no row.
- A Postcard is 1–5 photos, a caption and an optional place. It is loose (no diary) or on a
  day. A loose postcard can be added to a diary day later. Nothing moves between diaries or
  between days.
- Deleting a diary deletes its postcards (the confirm shows the count). Deleting a postcard
  leaves the diary. Deleting a day with postcards deletes them too.
- Required at setup: title and dates. Optional: destination, cover (defaults to the first
  postcard photo).
- Flow shape: "Next: Add Your Days" creates the diary and returns its candidate days; each
  filled day is saved as its own act; "Post" submits them; Cancel on the days screen deletes
  the diary just created ("Discard this diary?").
- Every screen renders an act the backend exposes: create / read / edit / delete a diary ·
  add / edit / delete a day · postcard on a diary day · postcard on a trip day with no
  activity · loose postcard · add a loose postcard to a day · edit a caption · delete a
  postcard · a feed of typed cards · profile sections. Do not add acts, states or groupings
  beyond these. Days, counts, "N days", section grouping, the itinerary arrow and card types
  come from the server, never the client.
- No likes, no comments, no reactions anywhere. Remove every heart, count and chat icon from
  the export.
- Vocabulary in copy: Diary, Day, Postcard. The word "entry" never appears.

ADAPT THE 7 EXISTING FRAMES
1. Post sheet (profile ⊕): title "Post"; rows "A Diary — Share your past travel memories" and
   "A Postcard — Send a quick travel update".
2. Diary setup: title "New Diary"; one line of subtitle copy (replace "Simplified memory
   setup"); fields Title (required), Destination, Cover ("Tap to add cover"), "When was
   this?" Start and End dates (required); CTA "Next: Add Your Days"; Cancel.
3. Diary days: badge DIARY; title = the diary's title; subtitle "Fill in the spots you
   remember from each day"; one card per server-provided day, "Day 1: Mar 15", each with a
   place field, a photo grid (selected checks, add tile) and a caption box. Settle the three
   labels the export carries only as widths: the photo-section label, the caption label, the
   add-tile text. Keep "You can skip days you don't remember." CTA "Post"; Cancel.
4. Postcard compose: badge POSTCARD; the chosen photos; caption; "Where were you?"; Post;
   Cancel.
5. Profile Diary tab: stats Entries · Itineraries · Followers · Following; tabs Diary |
   Itineraries; diary sections (thumbnail, title, "destination • N days", the orange link with
   arrow only when the section's trip has a published itinerary, kebab, collapse chevron);
   postcards flat inside with a "Day N" meta line; loose postcards as full cards above the
   sections. Make "N days" agree with the day cards.
6. Profile after posting a diary: toast "Diary posted!" (auto-dismiss after 2 seconds), the
   new section at the top.
7. Profile after posting a postcard: toast "Postcard posted!", the loose card at the top, no
   engagement row.

NEW FRAMES
A. Postcard photo picker (device roll, 1–5, selected checks, count pill) — the step before 4.
B. Diary detail, owner: cover header, title, destination • N days, date range, author; days
   as sections with their postcards; include a day with no postcards; owner acts: add a day,
   add a postcard to a day, edit diary, delete diary.
C. Diary detail, visitor: the same with no owner acts.
D. Add a postcard to an existing day: the single-day version of frame 3's card.
E. Add a day to an existing diary: next ordinal, date, place.
F. Edit diary: title, destination, cover, dates (editing dates never adds or removes days).
G. Postcard detail, owner and visitor: photo carousel with the "1/5" pill and dots, caption,
   place, day, author, posted date; owner acts: edit caption, delete, and "Add to diary" for
   a loose postcard.
H. Add-to-diary picker: choose a diary, then a day.
I. Home feed: a standalone diary card (cover, title, destination • N days, author row, posted
   time) and a loose postcard card with no trip line, beside today's derived postcard card.
J. Trip workspace day card gains "Post to diary": a compose screen with photos from the
   device or the trip's Photo Dump, caption, place; the postcard lands on that day with no
   activity.
K. Profile Diary tab states: empty (no diaries, no postcards); kebab menu on a section (Edit
   diary, Delete diary); kebab on a loose card (Edit caption, Add to diary, Delete).
L. Confirms: delete diary ("Delete this diary and its 12 postcards?"); delete postcard;
   delete a day with postcards; "Discard this diary?" on Cancel after Next.
M. The meta line for a postcard with no activity: settle what replaces "Day 1 · 06:12 PM"
   and what the bold title line shows when there is no activity title.
```
