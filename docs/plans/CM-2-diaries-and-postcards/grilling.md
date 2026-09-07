# CM-2 — Diaries and postcards, posted on their own: the grilling record

**Status: grilled, not yet specced.** `/grill-with-docs`, 2026-09-05, two rounds plus a pass over the founder's Figma export and an alignment check ("the backend defines the flow; the UI only talks to it through APIs"). Every ruling below is the founder's, on the record. **The spec is written when the Claude Design set lands under `mocks/`** — `/to-spec` then `/to-tickets` in one pass, owner review before anything is built. The design prompt that produces that set is `design-prompt.md` beside this file.

**Why this file exists rather than waiting for the spec:** CM-1's rulings lived only on an unmerged branch for a week, and on 2026-09-04 the epic map on `dev` re-minted the diary decoupling as ungrilled future work. Nothing load-bearing lives only in a conversation or only on a branch nobody has merged.

---

## The model, glossary-ready

The tree is uniform on both sides. **Trip → Day → Activity** is planning; **Diary → Day → Postcard** is telling; **Itinerary** is a trip's published face. Everything on the telling side is *derived at birth and independent afterward* — snapshot semantics, never event replication, exactly as CM-1 built the postcard.

| Term | Definition (proposed canon; enters `02-domain-model.md` with the spec) |
|---|---|
| **Diary** | One author's telling of a journey: a **title**, a **destination**, a **cover**, and **dates**, made of **Diary Days**, each holding **Postcards**. Two births: **derived** — minted once per author per trip, the first time that author posts a postcard from one of its activities or days, its four fields snapshotted from the trip and the author's to edit from then on; or **standalone** — from the memory setup, with **no trip at all** and no limit per author. **No trip row is ever created for a memory.** Public to whoever the author's Profile Visibility admits (ADR-034), from the moment it exists. A **living collection**: "Post" creates it, every later day or postcard is an edit, visible the moment it lands; no draft state, no second publish act. |
| **Diary Day** | An **ordinal**, a **date**, and a **place** ("Where were you?"). Standalone: derived by the server from the diary's date range at setup; a skipped day has **no row**; days can be added later. Derived: minted for a trip day the first time the author posts on it, snapshotting the ordinal, the title, and the date derived from the trip's dates. Days never reorder after birth. Editing a diary's dates never creates or deletes days. |
| **Postcard** | Unchanged from CM-1 in shape — 1–5 photos, an optional caption, an optional place, authorship-only authority — with one addition: it belongs to a **Diary Day or is loose**. **Many per day.** Derived postcards keep one-per-activity-per-author; a postcard may sit on a **trip day with no activity** (the activity is provenance, not a requirement). A loose postcard can be **added to a diary day** later; nothing moves between diaries or between days in CM-2. |
| **Diary Entry** | **Retired.** The old world's name for a trip-rooted postcard. The glossary keeps a one-line pointer to Postcard for readers of old specs. The word "entry" appears in no traveler-facing copy. |

Trip, Itinerary, Workspace: untouched.

## Rulings

Round 1 was issued against the founder's spoken model; the Figma export then overturned three of its recommendations; round 2 was issued against the export. Numbered as settled, not as asked.

1. **Trip-less creation is IN, and it is the story.** Both flows in the export are standalone: a Diary from the memory setup, a Postcard from nothing. *(Overturns the agent's round-1 recommendation to keep trip-less creation out.)*
2. **The memory setup creates a Diary, never a Trip.** Its four fields are a trip's four fields, and the founder ruled against (B) "a Memory Trip, real trip row, completed, owner-only" in favour of (A) the Diary carrying the fields itself. *("no it should not create any trip.")*
3. **The Diary contains Days; it is not a Day.** *(Corrects the agent's two-round reading of "a diary will be the whole day".)* "You can add a day and you can add a postcard per day, same as how a trip adds day and activity." The Diary is "basically a collection of postcards with a title, captions etc" — CM-1's album diary with the four memory fields and a Day level added.
4. **Diary and Postcard stay two objects** with one shared shape in code (photos, caption, place). The TW-1 ruling stands; cardinality and rendering differ.
5. **Many postcards per day.** The export's one-card-per-day is the simplified setup flow, not the model's rule.
6. **A postcard may land on a trip day with no activity**, which is what the workspace day card's new act does. A loose postcard may be added to a diary day. No moving between diaries or days in CM-2 (delete and repost).
7. **Deleting a diary deletes its postcards** — CM-1's ruling stands now that the Diary is a collection again, including for a postcard that was loose first. The confirm names the count. Deleting a postcard leaves the diary and its day. Deleting a day with postcards deletes them, same confirm.
8. **Living collection, no draft state.** "Post" creates; later adds are edits.
9. **Required at setup: title and dates.** Destination optional. Cover optional, defaulting to the diary's first postcard photo.
10. **A derived diary's four fields are snapshotted at mint and author-editable after** — the author's telling, not the owner's trip; the same rule is what lets it survive the trip's destruction with no special case.
11. **Home feed: loose postcards (no trip line) and standalone diaries appear**, the diary as a **new card type** beside today's postcard card. A derived diary gets no card of its own; its postcards are already on the feed one by one.
12. **Derived diaries are in scope**, posted from the **workspace day card** ("Post to diary"). Without it "Diary → Day → Postcard" would hold only for memories.
13. **Likes and comments are OUT.** The export draws "14 likes", heart and chat icons on every card; none exists (stars, reviews, comments are parked E4 lines). Recorded as the mock's known deviation; the engagement row is removed from the screens.
14. **Profile stats become Entries · Itineraries · Followers · Following** (the export's own note). Entries counts everything the Diary tab shows — diaries and loose postcards. Itineraries is the published count under a new name. The tab label stays **Diary**.
15. **Old entry endpoints become ADAPTERS over the new tables**, answering the old shapes; existing screens keep calling them; new screens use the new grammar. **Deletion is parked** as an epic-map line, trigger: the client's last old-path call gone. *("don't delete just yet, park a deletion info. just rewire the existing to the new one.")* No ADR-008 waiver is needed.
16. **Backfill** preserves entry ids (photo keys and shared links derive from them); one derived diary per author per trip minted with the trip's four fields; diary days from the activity's day where it still exists, from the entry's own `day_label` ("Day N…", our own format, `ActivitySnapshot`) where it does not. A Flyway migration with a stepping IT, sabotage-checked.
17. **The trip-started gate binds derived content only.** Standalone diaries have no gate.
18. **Story shape: one story, `CM-2`, tickets in two arcs** — the model re-cut, the reader cutover and the backfill first; the client repository layer and the screens second. CM-1 lands rot-fixed before CM-2 branches. The Claude Design set is the archived baseline under `mocks/`; the Figma export of 2026-09-05 is not.
19. **Visibility**: all three content objects are fenced by the author's Profile Visibility (S4.39, ADR-034); none carries a toggle. CM-1's public-or-private audience on the itinerary object is dropped in the rot-fix, not re-homed.

**One assumption stated rather than asked, unobjected:** editing a standalone diary's dates never creates or deletes days; days are added through an explicit act.

## The contract seed — the backend defines the flow

Confirmed at the alignment check: every act above is a backend act; every screen is a surface over one; the client reaches the wire only through the repository layer's typed `apiClient` (ADR-001, P6); the tickets run backend first so the contract exists before a screen is wired. **Where a mock and the contract disagree, the contract wins and the mock changes.** The mocks are the visual baseline, not the behavioural one. CM-1's `docs/design/08-object-contracts.md` is the reference; CM-2 extends it additively.

| Act | Endpoint (additive to CM-1's grammar) | Screen |
|---|---|---|
| Create a standalone diary | `POST /v1/diaries` (title, dates; destination, cover optional) | setup |
| Read a diary with its days and postcards | `GET /v1/diaries/{id}` | detail, feed tap |
| Edit, delete a diary | `PATCH`, `DELETE /v1/diaries/{id}` | detail, kebab |
| Add, edit, delete a day | `/v1/diaries/{id}/days[/{dayId}]` | days, detail |
| Postcard on a diary day | `POST /v1/diaries/{id}/days/{dayId}/postcards` (multipart) | days, detail |
| Postcard on a trip day, no activity | `POST /v1/trips/{id}/days/{dayId}/postcards` — mints the derived diary and day | workspace day card |
| Postcard from an activity | CM-1's, unchanged | Add to Diary today |
| Loose postcard | CM-1's `POST /v1/postcards` | compose |
| Add a loose postcard to a day | `PATCH /v1/postcards/{id}` with diary and day | picker |
| Feed of typed cards (postcard \| diary) | `GET /v1/feed` — today's `/v1/feed/postcards` stays as an adapter | Home |
| Profile sections, loose postcards, stats | `GET /v1/travelers/{handle}/diaries` | Diary tab |

Three behaviours the export could be read as giving to the UI, taken back by the contract:

1. **Day generation and skipping are server rules.** The create response carries the candidate days; a day row exists only once it has a place or a postcard. The screen renders the days the API returns and never computes a date.
2. **"Post" on the days screen.** Recommended and unobjected: the setup's **"Next: Add Your Days" creates the diary** and returns its candidate days; **each filled day is its own act**; "Post" is the client submitting them in sequence; **Cancel on the days screen deletes the diary it just created** ("Discard this diary?"). The alternative — one composite request creating diary, days and every postcard atomically — was set aside: it would carry twenty photos in one request, and an empty diary is a legitimate object by ruling 8.
3. **Feed and profile grouping are server fields.** Typed cards; diary sections with loose postcards separated; section headers, "N days", the itinerary arrow (only when the section's trip has a published itinerary) and the Entries count all come from the server. The client groups nothing and sorts nothing.

## What happens to CM-1

CM-1 (`feature/CM-1-content-module`, PR #38) **stays, nearly whole, and goes first.** The model settled here is closer to what CM-1 built than to anything proposed in between.

- **Survives untouched:** the four modules and the boundary guard · the postcard as the atom with its two births, snapshot at post time, authorship-only authority, delete crossing the archive freeze · the diary minted once per author per trip, delete taking its postcards · publish minting the itinerary object with an identity that survives publish cycles and the trip's destruction · trip destruction with structural survival · V47's two FK drops · the contract doc, the stepping ITs, the 43 contract ITs.
- **The rot-fix, on the branch, before merge — no grilling, no model change:** migrations renumbered past `dev`'s V48 · ADR-034 → **ADR-035** (S4.39 took 034 on `dev`) · the itinerary object loses its public-or-private audience and the publish grammar stops writing the `visibility` column V48 dropped · new-world reads go through `AuthoredContentAudience` instead of "any signed-in traveler" · the postcard snapshot picks up PL-2's map pin · `e2e/api/diary.spec.ts` "deleting the activity clears provenance" re-pinned to the ruled dangling behaviour (the Java twin was re-pinned at CM-1's gate; the spec was missed, and it is the one failure on the branch's last CI run) · the three doc conflicts (BUILD_STATUS, 02-domain-model, adr-log) resolved · the branch's epic-map lines ported, the profile-visibility one marked discharged by S4.39 · the "[PARKED]" tag dropped from PR #38.
- **Two records travel with the merge:** a comment on CM-1's spec that the diary's shape is re-cut at CM-2; the epic map's 2026-09-04 diary line marked as pulled into CM-2 (done in this commit).
- **CM-2 changes afterward, on its own branch:** the diary gains destination, cover, dates and a Day table · the postcard gains a day reference and a re-home act · standalone diary creation takes title and dates · a postcard can land on a trip day with no activity · the readers cut over, the backfill runs, the old entry paths become adapters · CM-2's migrations start where CM-1's end.
- **Dropped:** the audience axis on the itinerary object. Nothing else.
- **The dark-window rules hold until CM-2's cutover:** nothing wired, no backfill, destruction unexercised. TW-1's design doc lands with the branch and stays parked.

## Sequencing

1. **Land CM-1 rot-fixed** (PR #38, in a worktree). Prerequisite for the CM-2 branch: CM-2 needs a base that already passes CI on `dev` with the profile fence and the migration numbers in place.
2. **CM-2** on `feature/CM-2-diaries-and-postcards` off `dev`, two ticket arcs.
3. **TW-1 after CM-2, never in parallel.** CM-2 removes the content half's 34 reach-ins into trip internals by cutting the readers over; TW-1 then moves a package with only the trip left in it. Both rewrite the same god module, and a parallel merge would cost more than either story.

## What the spec will carry (owed, not yet written)

- **ADR-036**, amending CM-1's ADR-035: the Diary as a collection with Days and the four memory fields; no trip row for a memory (memory-as-Trip rejected on the record); adapters kept over the old entry paths rather than deleted; the feed's second card type. All three ADR tests hold: hard to reverse (tables, backfill, vocabulary), surprising without this record, chosen over a real alternative.
- **Glossary re-cut** in `02-domain-model.md`: Diary, Diary Day, Postcard as above; Diary Entry reduced to a pointer.
- **Epic-map lines:** the old entry endpoints' deletion, parked with its trigger · likes/comments recorded as the mock's deviation, riding the existing E4 lines · discharges: "Standalone content" (CM-1 branch line), "Profile visibility" (CM-1 branch line, by S4.39), the 2026-09-04 diary line (this commit).
- **BUILD_STATUS row** for CM-2 — added at `/to-spec`, after CM-1's row has merged, to avoid a second conflict on that file.
- **Candidate-capability note:** standalone creation — trip-less diaries and postcards are a capability, footprint-growing, not governance (register #14).
- **Freshness note:** Home stays pull-based (S4.35's ruling for public surfaces); the profile Diary tab stays pull-based; the diary detail is focus-fresh pull; the workspace day card's new act rides the workspace's live topic as today.
- **Mocks:** the Claude Design set under `mocks/`, checked against the contract when it lands. Anything the frames draw with no endpoint behind it is a gap in the frames, not a feature request.

## The Figma export, read (2026-09-05)

Seven frames, read from their own markup: the profile ⊕ **Post sheet** ("A Diary Entry — Share your past travel memories" / "A Postcard — Send a quick travel update") · **Diary entry setup** (Trip Name, Destination, Cover Photo, "When was this trip?" start/end; "Next: Add Your Days") · **Diary entry_postcards** (one card per day from the range, "Day 1: Mar 15" … "Day 4: Mar 18", each with a place field, a photo grid with selected checks and an add tile, a caption; "You can skip days you don't remember."; Post) · **Postcard compose** (two photos, caption, "Where were you?"; badge POSTCARD; Post) · **Profile Diary tab** in two iterations (stats "Published · Trips" → "Entries · Itineraries"; trip sections with thumbnail, title, "destination • N days", an orange link-with-arrow only on published trips, kebab, collapse chevron; cards flat inside with "Day 1 · 06:12 PM" meta; "14 likes") · **Profile after a diary posted** (toast "Diary entry posted!", 2 s) · **Profile after a postcard posted** (toast "Postcard posted!"; the loose postcard as a full feed card above the sections, heart + chat icons). Four labels arrive only as widths: the photo-section label (241 px), the caption label (102 px), the add-tile text (54/50 px), and the setup subtitle "Simplified memory setup". The export mixes five type families (Outfit, DM Sans, Geist, Figtree, Inter); the prompt keeps them as drawn.

## Comments

- *2026-09-05, closing the grilling:* the agent's round-1 and round-2 recommendations that the founder overturned are kept above, inside the rulings that overturned them, rather than deleted — the misreadings ("Diary = Day", "trip-less out", "memory as Trip") are exactly what the next reader will reach for first.
