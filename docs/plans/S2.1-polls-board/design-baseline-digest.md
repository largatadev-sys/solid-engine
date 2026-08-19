# S2.1 — Design-baseline digest: the Claude Design polls canvas

**Source of truth:** [`Polls Spec.dc.html`](https://claude.ai/design/p/34e84995-d099-46dd-a784-3b762a09d6f4?file=Polls+Spec.dc.html) in the founder's Claude Design project (`34e84995-d099-46dd-a784-3b762a09d6f4`) — a live mock whose frame annotations are **normative** (the S4.22 home-feed precedent). Seeded from the founder's Figma CSS export (the S4.17-parked `workspace-voting` + `create-poll` pair, archived in the same project as `uploads/poll.txt`) with the grilling's rulings applied. This digest is the offline record; the canvas wins where they drift.

**Visual language:** `#EA580C` primary · stone greys (`#1C1917`/`#44403C`/`#78716C`, borders `#E7E5E4`) · Outfit 700 for card titles · Geist elsewhere · 16px-radius poll cards, 12px-radius options and inputs · amber open-badge (`#FEF3C7`/`#D97706`) · CTAs keep the shipped 4px-radius style.

## The canvas's own normative-rules block (verbatim in intent)

Single-choice only, no multiple-votes toggle · one vote per member, changeable while open · votes always attributed and visible, even before you vote · every poll has a required deadline (default +24h) · creator or trip owner can close early or delete (confirm on delete) · pull-based — no push; board refreshes on focus / pull-to-refresh · **no "Added to Itinerary" label** — polls never touch the plan (the export's green label is stale, do not build it) · winner = highest vote count; ties star every leader; a zero-vote close stars nothing.

## Frame-by-frame

### 1 · Empty board
Bar-chart glyph in a `#FAF9F6` circle · "No polls yet" (Outfit 700 17) · copy: *"Can't decide on an activity? Put it to a vote. Anyone in the trip can start a poll."* · filled-orange **Create a Poll** CTA (the only filled-orange button the board ever shows). Identical for every member — creation is not owner-gated. Tab row corrected to the shipped one: Day-by-Day · Polls · Travelers · Photo Dump · Chat.

### 2 · Open poll, not voted, option selected
Board header: `ACTIVE POLLS` uppercase label left, **Create a Poll** text-button (orange, plus glyph) right — the CTA moves here once polls exist. Card: question (Outfit 700 16) · meta "Poll closes in 3 hours · Oct 24, 6:00 PM" · `VOTING OPEN` amber badge · kebab (grey when passive). Options as radio cards: selected = `#FFEDD5` fill + 1.5px `#EA580C` border + thick-ringed radio; unselected = white + `#E7E5E4`. Attribution beside every option **from the moment the poll opens**: initial-avatar cluster (16px, −6px overlap, white ring) + "N votes"; zero votes shows the count alone, greyed. Progress: "Voting Progress" / "5 of 6 voted" + 6px orange bar; M = current member count, live. **Submit Vote** outline-orange, 53px; disabled at 45% opacity with nothing selected. **Selection ≠ vote** — the amber option is local until Submit. Active polls stack **newest-first**; COMPLETED POLLS follows.

### 3 · Voted — the two-grammar rule
**State A (recorded, at rest):** your option on cream `#FFF7ED` + 1.5px orange border, **filled orange check** (not a radio) + white-on-orange `YOUR VOTE` tag; no Submit button — replaced by the quiet hint *"Tap another option to change your vote."*
**State B (changing):** the new selection takes the amber radio grammar; the recorded option **demotes to grey** (outline check + grey tag) so exactly one option ever reads orange; the button returns **filled** and names the target — *"Change Vote to "Snorkeling""*. Tapping the recorded option cancels back to state A. Your count moves only on submit.
*(Frame 3 draws counts without avatar clusters — a simplification of frame 2, not a rule change: attribution stays on every option in every state.)*

### 4 · Completed polls — winner, tie, zero
`CLOSED` grey badge · meta "Poll closed · ‹when›". Closed cards **drop radios and the progress section**; attribution stays on results. Winner: orange **star** on quiet paper `#FAF9F6` — no green anywhere. Tie: every leader starred, meta gains "· Tie". Zero votes: no star, options collapse, meta gains "· No votes", body line *"Nobody voted before this poll closed."* A past-deadline poll reads closed with **no server action** — the deadline alone flips the state.

### 5 · Creator / owner actions
Kebab renders **only** for the poll's creator and the trip owner (darker glyph when active); everyone else sees the badge alone. Menu: **Close Poll Now** (clock glyph, immediate, **no confirm** — results survive and the deadline was going to do it anyway) · **Delete Poll** (red `#B91C1C`, trash glyph). Delete confirms in a dialog that names the poll and its vote count: *"Delete this poll?" / ""‹question›" and its N votes will be gone for everyone. This can't be undone."* — red **Delete Poll** + outline **Keep Poll**. On a closed poll the menu shows Delete only.

### 6 · Create a Poll
Separate screen, back chevron + title. Fields: **Poll Question** (single input) · **Options** with helper "2–10 · single choice", trash per row (trash hides when only 2 remain), **Add Option** (hides at 10) · **Poll closes** settings card — date-time trigger, helper "Required · defaults to 24 hours from now", opens the platform picker. No "Allow multiple votes" toggle — single-choice is fixed. **Create Poll** (black, 4px radius) disabled until the question and 2 non-empty options exist · **Cancel** outline.

## Amendments from the Figma export (ruled at the grilling, applied on the canvas)

1. **"Added to Itinerary" green winner label — cut.** Polls are free-standing (decision 2); the label was a lie. The star survives as the computed-winner mark.
2. **"Allow multiple votes" toggle — cut.** Single-choice fixed (decision 5); the export itself shipped it `display: none`.
3. **Stale chrome corrected:** the export's tab row (with Notes, without Chat), bottom nav, "Draft TRIP Workspace" badge, and Finalize/Save CTAs are pre-S4.25 chrome — the shipped app's row and chrome win.

## Where the canvas superseded a grilling default

**Active-poll ordering: newest-first** (frame 2 annotation) — the grilling round had provisionally said closing-soonest-first; baseline wins, spec updated before publication.

## Deliberately not drawn (behavior from the spec, no frame owed)

The archived-trip frozen board (S4.23 posture — existing patterns) · cap-refusal error states (form messages per existing form idiom) · the confirm on none of close/vote (only delete confirms) · loading/refresh chrome (standard board pull-to-refresh).
