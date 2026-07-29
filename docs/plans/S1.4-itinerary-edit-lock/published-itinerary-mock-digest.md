# Published-itinerary mock (founder CSS export, received 2026-07-24 at the S1.4 grilling) · digest

**What this is:** the design-bearing content of the founder's Figma CSS export of the **published itinerary view** (`itinerary screen.txt`), received while grilling what was then the private-comments story. It triggered the 2026-07-24 reversals: it is the *public* surface (S4.6/register #5 etc.), not a planning surface — which surfaced that the founder wanted no planning comments at all. This digest strips auto-layout boilerplate and status-bar chrome, same discipline as S1.3's mock digest.

**Disposition: nothing in this mock is S1.4's to build.** S1.4 became the edit-lock story; every frame here parks to its owning E4/E3/E5 story. Filed as **register #5's design input** (and the other registers noted below).

## Design language (input to the pre-E4 visual-direction decision)

Consistent with the 07/18 mock: Inter throughout · ink `#000000`/`#111111` · secondary `#666666`/`#999999` · borders `#E4E4E4`/`#EBEBEB`/`#F7F7F7` · **accent orange `#FF751F`** (active tab underline + text, star fills, "View Booking Options" link) · cards radius 16, chips pill radius 100, primary CTA `#000000` white text · page H1 32/800, tab labels 15/500 (active 15/700).

## The screen: `Itinerary_Overview/Landing` + tabbed variants

One published-itinerary screen with a **five-tab bar: Overview · Day-by-Day · Diary Entry · Comments · Reviews** (the Reviews frame's tab bar drops Overview → four tabs; a mock inconsistency to resolve at S4.1). Shared header on every tab:

- **Location + duration pill** ("PALAWAN" black pill + "5 Days").
- **Creator block**: avatar · "Jose Reyes" 14/700 · **`@josetravels`** 12/400 grey · **Follow button** (outlined, plus icon).
- H1 "Island Hopping in El Nido" 32/800.
- **Stats board** (bordered card, 3 columns): "4.8 ★ / 124 Reviews" · "28 / Forked" · "₱15k / Est. Cost/Person".

### Frame dispositions

| Element | Owning story / register |
|---|---|
| Publish surface itself (a published itinerary rendered to non-members) | **S4.1** (register #11 — this is *another* publish-surface input, joining the 07/18 mock's frames 5–7) |
| Follow button + `@handle` | **friend graph** (post-validation backlog) + the **pre-E4 handle decision** — both already registered; this is a re-confirmation, same as the discovery mocks |
| Stats board: rating aggregate | **S4.5** (register #4) |
| Stats board: fork count + "Fork This Trip" bottom CTA | **S4.7** |
| Stats board: Est. Cost/Person | **S4.1/S5.4** (the est-vs-actual question, already registered) |
| Overview tab: photo-gallery grid (2+3 thumbnails, "+27" overflow tile), description, **Standouts** checklist | **S4.1** (Standouts is the reserved glossary term) + **S3.3** (media) |
| Day-by-Day tab: read-only day accordions with activity cards (time rail, title, place, "View Booking Options" link, photo thumb) | **S4.1** (consumer rendering of the S1.3 structure); booking options panel stays **E6** |
| Diary Entry tab | **E3 / S4.2** (Highlights surface, register #13) |
| **Comments tab** (below) | **S4.6** (register #5) |
| Reviews tab (below) | **S4.5** (register #4) |

### Comments tab — register #5's design input

- **Flat list**: avatar 36px · name 14/700 · relative time 12/400 grey · body 15/400·150%.
- **One threaded reply**: indented under the first comment with a 2px rail, smaller avatar (24px), author labeled **"Jose Reyes (Creator)"** 13/700 — the register's recorded *creator badge* + *threaded replies* inputs, now drawn.
- **Composer bar**, pinned bottom: avatar · "Write a comment…" placeholder · circular send button. Header "Comments (4)" exists but is `display:none` in the export.
- Commenters include non-members ("Has anyone tried this in August?") — confirming the public, consumer-facing reading.

### Reviews tab — register #4's design input

- **Stats board**: 4.8 aggregate 48/800 + star row + "Based on 124 Reviews" · **histogram** rows 5★→1★ with counts (98/18/5/2/1).
- **Sort dropdown** ("Sort by: Most Recent") + **filter chips** ("All (124)", "5★ (98)", "4★ (18)", "3★ (5)").
- **Review cards**: avatar · name · **trip-type + month** subtitle ("Traveling Couple • Jul 2026", "Solo Backpacker", "Family Trip") · star row · relative time · **category chips: Accuracy / Pacing / Value** with per-dimension scores · body · optional **photo attachments** (72px row) · **"Helpful (n)"** thumbs-up pill (a *new* input register #4 hasn't recorded: review upvotes) · a hidden share icon (`display:none`).
- Note: chips show three dimensions; register #4's recorded proposal says overall/accuracy/pacing/value — the overall star presumably *is* the fourth. Resolve at S4.5.
