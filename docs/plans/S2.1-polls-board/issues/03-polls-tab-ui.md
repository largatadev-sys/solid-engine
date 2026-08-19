# 03 — The Polls tab: board, vote grammar, creator actions, Create a Poll

**What to build:** the canvas's six frames as the live Polls tab — un-grey the tab on the shipped row and ship every board state plus the create screen. The canvas is the design baseline (mocks-are-baseline: copy the frame, icons included; deviate only where the platform forces it, and say so).

**Blocked by:** 02 (the data layer and pure module it renders from).

**Status:** needs-triage

- [ ] `WorkspaceTabRow`: `polls` drops `comingSoonSurface` — the tab routes to the board on **both** surfaces (viewer and editor share the row, S4.17).
- [ ] Frame 1 — empty state: glyph circle, "No polls yet", the copy verbatim, filled-orange Create a Poll CTA (the only filled-orange button the board ever shows).
- [ ] Frame 2 — board: ACTIVE POLLS header with the Create a Poll text-button once polls exist · poll card (Outfit 700 question, deadline meta, VOTING OPEN amber badge, kebab only for creator/owner) · option radio cards with attribution (initial-avatar clusters + counts, visible before voting; zero votes = greyed count alone) · Voting Progress bar (M = denominator from the wire) · Submit Vote outline CTA, disabled at 45% with no selection. Selection ≠ vote.
- [ ] Frame 3 — the two-grammar vote states: recorded = cream `#FFF7ED` + filled check + YOUR VOTE tag + "Tap another option to change your vote" (no submit button); changing = new selection amber, recorded demotes to grey check + grey tag, CTA fills and names the target ("Change Vote to "X""); tapping the recorded option cancels back.
- [ ] Frame 4 — completed section: CLOSED badge, radios and progress dropped, winner(s) starred on `#FAF9F6`, "· Tie" meta on ties, zero-vote body line, attribution retained. **No "Added to Itinerary" anywhere.**
- [ ] Frame 5 — kebab menu (Close Poll Now / Delete Poll red) + delete confirm dialog naming the poll and vote count, on the platform-forked dialog pattern (never `Alert.alert` on web — the S1.3 lesson); close acts without confirm; closed polls offer Delete only.
- [ ] Frame 6 — Create a Poll screen: question input, options list (trash hides at 2, Add Option hides at 10, "2–10 · single choice" helper), Poll closes card with the platform-forked DatePicker (required, prefilled +24h, "Required · defaults to 24 hours from now"), Create Poll black 4px CTA disabled until valid, Cancel outline. Server cap refusals render as visible form messages.
- [ ] Archived trip: the board renders read-only under the existing fence posture — no create CTA, no kebab, no submit (the S4.23 chrome patterns).
- [ ] Register-#2 analytics on create/vote/close/delete taps.
- [ ] Layout on the phone frame: trailing controls get `flexShrink: 0` + `numberOfLines={1}` (the S3.1 truncation trap) — check the option rows with long labels on the emulator, not just the preview.
