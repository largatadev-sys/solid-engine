# 05 — Presence polish: idle, wake, hover, keyboard, Reduce Motion

**What to build:** the dock's life when nobody is dragging it, per spec decisions 7 and 12
and the `feedbackMotion` block (which this ticket completes). Idle fade to 0.4 after 2,600ms
untouched — dimming, never disabling; wake to full on touch, hover, or focus; the launch
wake holding full opacity for 2,600ms once per session, and only when the dock is visible.
Fine-pointer ergonomics: hover wakes with grab/grabbing cursors and the idle fade is skipped
entirely. Keyboard: Enter/Space opens the sheet, arrow keys nudge 24px then re-snap and
persist like a drag, an accent focus-visible ring at the standard offset. Reduce Motion —
read from both signals on web — turns the snap into a linear move, drops the lift's scale,
and flattens rises to crossfades; the launch wake and idle fade stay, as information. The
dock fades out while its own sheet is open and returns awake after close.

**Blocked by:** 04 (the nudge re-snaps and persists through the drag machinery).

**Status:** ready-for-agent

- [ ] Untouched for 2.6s the bubble sits at 0.4 and still opens the sheet on tap; any touch/hover/focus restores full opacity in 120ms
- [ ] Cold start with the dock visible: full opacity for 2.6s, then the idle fade; a build where the dock is hidden plays no wake
- [ ] Under a fine pointer the idle fade never engages and the cursor reads grab, then grabbing during a drag
- [ ] Enter and Space open the sheet from keyboard focus; arrows move the bubble 24px, it re-snaps, and the new position persists
- [ ] With Reduce Motion on (asserted on at least one platform): linear snap, no lift scale, crossfades — and the wake and fade still occur
- [ ] The bubble is invisible and inert while the sheet is open, back and awake after Done or dismiss
- [ ] Every timing in this ticket reads from the `feedbackMotion` block — no constant from the poll, chat, or live-update groups is imported by the feedback module
