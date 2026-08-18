# Web-walk flow inventory — what the three retiring walks cover

*(minted 2026-08-13 at S4.22's close, on the founder's ruling to retire `drive-create-flow.js`, `drive-workspace.js` and `drive-publish.js` rather than repair them — epic map, "Three web walks have rotted against the surfaces they test")*

**What this is for.** These three walks are being deleted, and the Playwright port rebuilds their coverage. Deleting them discards the cheap part (CDP plumbing) and the expensive part (years of accumulated *"this is what must be true on this screen"*) alike — this file keeps the expensive part. It is a **requirements inventory, not a test plan**: it says which flows the app has and which the walks could still reach on 2026-08-13, so the port knows what to build and, more usefully, what it must build *back*.

**How it was measured.** From `smoke-all` runs on a clean Chrome profile against `dev`-equivalent code, on 2026-08-13. Green assertions were read as *"this reaches the product today"*; red ones were traced to their cause before being classified. **Counts: create-flow 12/23, workspace 37/14, publish 24/12.**

**The finding that matters most, stated once:** the surviving green is almost entirely **rendering and read-only surfaces**. Nearly every *act* has gone dark — Finalize, Start Trip, Step back, Publish, Copy Link, Edit Itinerary. So the coverage retirement actually costs is not "some assertions": it is **every lifecycle and publish mutation the web rung used to exercise**. A port that rebuilds only the green would silently ship less coverage than the walks had when they were healthy.

---

## 1 · `drive-create-flow.js` — Trips landing, lifecycle sections, draft preview

**REBUILT AT H1 → `mobile/e2e/web/create-flow.spec.ts`** *(2026-08-18)*. The dark acts listed below — Finish Itinerary, Start trip, Step back — are covered again and asserted against the SERVER, not the screen. Two of this section's items were stale and were corrected rather than copied: the create CTA is **Plan a Trip** (renamed at S4.15) and **Add a Past Trip** was scrapped, so the spec asserts its absence.

**Reaches today (12).**

| Flow | What must be true |
|---|---|
| Trips landing renders | Not the S0.4 white screen; page has text |
| Tab bar | Four tabs including Discover, **no centre +** |
| Lifecycle grouping | Renders as **sections, not chips** (ADR-020) |
| Day schedule | Renders with its day tabs |
| Activity cards on the schedule | Carry **no edit attribution** — this is not the workspace |
| Lifecycle vocabulary | The terminal rung is **not** called "Complete" — one word must not name two facts (ADR-018/020) |
| Draft preview | Offers **no publish controls** — the gate is upstream of the screen |
| Upcoming trip appears | Sits under "Upcoming Trips" after finish-planning |
| Upcoming preview | Is the itinerary view, banner and all |
| Upcoming publish | Offers **no** publish button the gate would refuse |
| Console/page errors | None |

**Dark, and why (23).** All cascade from one missing control: the walk hunts **"Create Itinerary"** and **"Add a Past Trip"**, renamed to *Plan a Trip* and scrapped outright at S4.15. Everything downstream of that first `NOT FOUND` fails for want of a trip to act on.

**Flows the port must rebuild** — these exist in the product and are currently unexercised on the web rung:
- **Create a trip through the UI**: Plan a Trip → the create form → the mock's fields
- The form says **Standouts**, never "Highlights" (the glossary reserves that word); **Add Standout** is the row control
- The terminal CTA continues to the **day schedules**
- A **draft card opens the day editor**, not the preview *(founder, 2026-08-04)*
- The preview's CTA walks on to **Preview Itinerary** → the reader's view
- The preview banner speaks the **honest tense** — nothing is published yet
- **Finish Itinerary** is the terminal act on a draft's preview; tapping it moves the trip to `upcoming` **on the server**, and lands back on Trips with **no celebration screen** (frame 7 belongs to publish)
- A trip card links to its **preview**, not the old workspace *(founder, 2026-08-04)*
- The workspace eyebrow and **Details tab** name the trip's position in the new vocabulary
- **Start trip** is offered, with a **one-step undo** back to planning (upcoming → draft reopens planning)

---

## 2 · `drive-workspace.js` — the Draft Workspace, editing session, activity form, drag-reorder

**REBUILT AT H1 → `mobile/e2e/web/workspace.spec.ts` and `mobile/e2e/web/drag-reorder.spec.ts`** *(2026-08-18)*. The drag half became its own spec because it is the one thing the CDP harness could never test: `Input.dispatchMouseEvent` synthesizes no PointerEvents, so a working drag read as dead. It now runs under real pointer AND real touch input. **One dark act came back red:** Finalize does not release the Editing Session — see the epic-map line; the spec carries a `test.fixme` that will go green when it is fixed.

**The richest of the three, and the most worth porting carefully. Reaches today (37).**

**Workspace shell**
- Viewer renders; a draft opens the workspace carrying the **Draft badge**
- Header offers **Edit Itinerary**
- The **six-tab row** is present, in mock order; **Notes was cut, never drawn**
- A draft shows **no ladder CTA** (Edit Itinerary is the act) and **no Step back** (nothing to step back to)
- Day list renders as stubs with activities readable
- **Polls** and **Chat** grey with a message rather than dead-clicking *(the S1.3 `Alert` lesson)*
- **Travelers** tab lists the roster; **Details** tab carries the plan fields and **no lifecycle control**
- Editor offers **Invite Traveler** on the header

**Editing Session (S4.18 ticket 01)**
- Entering the editor **acquires the session server-side**
- **t2 is refused** the session while t1 holds it
- A Ready trip's editor is **read-only** — no editing affordance renders

**Retired routes**
- A retired `?day=` deep link **redirects into the workspace**, never dead-ends (ticket 07)
- So does the retired day view

**Activity form (S4.18 ticket 05)**
- Reachable from a row; opens on **Edit Activity**
- Shows **exactly the mock's five fields**; the four culled fields are **absent**
- Offers **Save Activity** and **Discard Changes**
- **Booking Link** takes a pasted URL, not the provider card

**Drag-reorder (S4.17 + S4.18)**
- The grip is **draggable on the web**, not arrows-only *(founder, 2026-08-09)*
- The drop **stages** rather than persisting — every plan op buffers until Save Changes
- An **upward** drag settles by easing to its slot — no jerk when React moves the node
- The upward drop stages too
- The grip is **keyboard-operable** — ArrowUp on a focused grip reorders the screen, and writes nothing
- The **arrow buttons are gone** from the rows

**Auth**
- Every `/v1` call from the workspace carried a **bearer token** *(the S3.3 media trap)*

**Dark (14) — the lifecycle ladder, almost in full.** These are product flows the web rung no longer touches at all:
- The viewer is **read-only**: no Add Activity, no Add a Day, no Finalize
- **Photo Dump** greys with a message
- **Edit Itinerary opens the Draft Workspace** (decision 4)
- The CTA rail is **Finalize above Save Changes** (frame 1 wins the flip)
- **Finalize** opens the confirmation sheet with the mock copy verbatim, offering **Finalize** and **Keep Editing**
- **Keep Editing** dismisses and leaves the plan a draft
- **Finalize** fires finish-planning — the trip is **Ready** — and **releases the Editing Session** on the way out
- The viewer then shows **Ready (green badge)** with **Start Trip**
- **Start Trip** walks the ladder to `ongoing`; the viewer shows **Ongoing** with **Complete Trip** and a **Step back** link *(named deviation)*
- **Step back** walks down **exactly one rung, never two**
- While t2 holds the session, the viewer **says who is editing** (ticket 01, AC 4)

---

## 3 · `drive-publish.js` — the preview, the publish act, the public projection

**REBUILT AT H1 → `mobile/e2e/web/publish.spec.ts`** *(2026-08-18)*. All 12 dark items are covered, including Copy Link proving itself a live control and unpublish leaving the trip COMPLETE. **One finding:** unpublish has no reachable UI control — a published trip redirects away from the only screen carrying the button — so the spec drives that act through the API and the gap is an epic-map line.

**Reaches today (24).**

**Preview is WYSIWYG**
- Destination pill and **derived** duration; Standouts; best time of year in the header
- The **Est. Cost row renders whether or not a total can be derived** (S4.13 decision 10)
- **Creator Tips** visible on the day cards; the card carries the **location**
- **And nothing else**: no time rail, no per-activity price, no description *(founder, 08/01)*
- **The absence rule**: no calendar date anywhere on the preview, and **no roster**
- The preview carries the **same five-tab shell** the public page does *(founder, 08/01)*

**The public projection, read by a stranger (t3)**
- t3 opens the copied route and reads the projection
- Five-tab shell renders, **Overview** winning the mock inconsistency
- The **derived total** is real and carries no "/Person"
- **The absence rule holds on the consumer screen too**
- **Day-by-Day** is a real tab; activity cards carry the tips and the booking link
- **View Booking Options** greys rather than opening a URL *(founder, 08/01)*
- **Diary Entry**, **Comments**, **Reviews**, **Follow** each grey with a message, never a dead click (AC11)

**Dark (12) — the entire publish act.**
- The eyebrow names where the trip is (ADR-019 — lifecycle while out of the feed)
- **Unpublishing leaves the trip COMPLETE** — it does not un-travel it (ADR-019)
- An unpublished trip offers the owner the **Publish CTA**, and it is reachable
- The preview renders the **amber scrub banner** in the honest tense (S4.13)
- The preview offers **Publish** and **Continue Editing**
- The preview **asks which audience, defaulting to Public** (ADR-018)
- Publish is clicked; the **success screen** lands
- It offers **Copy Link** and **Share**, shows the route it copies, and **Copy Link is a live control**

---

## 4 · `drive-discovery.js` — the Discover surface (S4.3, added 2026-08-14)

**PORTED AT H1 → `mobile/e2e/api/discovery.spec.ts` (9 assertions) and `mobile/e2e/web/discovery.spec.ts` (21)** *(2026-08-18)*. This was the pilot: the only walk with a green measured baseline, ported first so a red spec could be attributed to the harness or the product with confidence. The API/screen split this section already recommended became the two projects.

**Not a retiring walk.** This one is new, healthy, and **34/34 green** on the day it was written, against the local full stack. It is inventoried here for the opposite reason to the three above: so the Playwright port carries it forward rather than rediscovering what Discovery owes. Its coverage is the story's ACs, and the split between API-level and screen-level assertions is deliberate — the exclusion proofs are cheaper and sharper against `/v1` than against pixels.

| Flow | What must be true |
|---|---|
| Strangers' surface | A published + public trip reaches a traveler who shares **no trip** with its author |
| Exclusion: private | A published-but-**private** trip is absent — for everyone, owner included |
| Exclusion: archived | An **archived** trip is absent however it was published (ADR-017's posture) |
| Count agrees with list | The sheet's promise: `/count` and `/itineraries` return the same total under identical filters |
| Destination filter | Narrows to that destination's trips, case- and padding-insensitively |
| Trending ranks | Ranked by trips **published** in the window — never creations |
| Trending never leaks | A private or archived destination appears in no row, not even as a count |
| Suggestions group | Destinations and Itineraries as separate groups, each capped at 3 |
| Discover tab is live | Opens a real screen; the coming-soon refusal is gone |
| Both rails render | Trending destinations **and** Recommended itineraries, with real data |
| Trending card | Names its destination and its trip count |
| See all | Lands on browse results carrying a count line |
| Destination tap | Opens results **filtered** to it, with the filter in the route |
| Filter badge | Counts active filter **groups**, not values |
| Search mode | The bar opens full-screen search; Cancel restores |
| Live suggestions | Typing surfaces both groups (**real key events** — see the note below) |
| Suggestion submit | Lands on results carrying `q=`, showing the matching trips |
| Recents persist | The submitted query is remembered on the device and renders on return |
| Filter sheet | Opens; offers the four duration bands; Apply previews the count before committing |
| Reset | Appears only once the draft differs from what is applied |
| Apply commits | The route carries the filters, so a shared search restores exact state |
| Honest stubs | Bookmark and author tap each print a refusal — **no dead clicks on either** |
| Card tap | Opens the existing published itinerary view |
| Auth | Every discovery read is bearer-authenticated — no anonymous GETs (S3.3's tell) |
| Console/page errors | None |

**Four harness lessons this walk paid for — do not port the defects, and do not re-learn them.**

- **A programmatic value setter is invisible to react-native-web's `TextInput`.** Setting `.value` and dispatching `input` leaves the field *showing* the text while `onChangeText` never fires, so a working search reads as completely dead. Focus the field and send **real key events** (`Input.dispatchKeyEvent`). Playwright's `fill()`/`type()` does the right thing natively — this trap is CDP-specific and should simply vanish in the port.
- **`innerText` reports what is PAINTED, not what the source says.** Section labels are uppercased by `textTransform`, so a case-sensitive match on "Trending searches" fails against a screen rendering `TRENDING SEARCHES`. Match case-insensitively, or assert on the source constant.
- **A card and its bookmark both carry the trip title**, and a last-visible-match selector takes the bookmark — so a title-only selector taps Save and reports a card that never opened. Anchor on the label's **start**, not a substring.
- **Suggestion groups cap at 3, on a database that accumulates every earlier walk's fixtures.** Asserting *this run's* stamp appears in a capped, alphabetically-ordered group demands more than the contract promises; assert the shape, the cap, and that every row genuinely matches. Same family as the S4.22 seeding trap — the local DB is not empty and pretending otherwise produces flaky red.

---

## Notes for whoever runs the port

- **Rebuild the dark flows first, not the green ones.** The green is what still works and would be noticed if it broke; the dark is what nothing watches. Porting green-first reproduces today's blind spot in a new framework.
- **Two harness defects must not be ported with the flows.** *(a)* The drivers **share one Chrome profile** (`%TEMP%\largata-publish-driver`), and two of these three pass in isolation while failing inside `smoke-all` because of it — Playwright's per-context isolation fixes this for free, so do not recreate a shared profile. *(b)* `drive-publish` needed a `TRIP_ID` env var `smoke-all` never supplied, so for a long stretch it **executed zero assertions while being counted as a failure** — the port must seed its own fixture or skip loudly.
- **The API rung stays.** `smoke-*.js` scripts are plain HTTP against `/v1` and are all green; the port's scope is the `drive-*` family only.
- **`smoke-all`'s `KNOWN_RED` entries go when the scripts go.** Leaving an entry behind for a deleted script is a map to nothing.
