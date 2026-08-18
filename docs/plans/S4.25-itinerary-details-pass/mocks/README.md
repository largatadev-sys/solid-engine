# S4.25 mock archive

**The mock is NOT archived here, deliberately — read it in the project.**

- **Claude Design project:** "Design improvement request", id `34e84995-d099-46dd-a784-3b762a09d6f4`
- **File:** `Itinerary Details Spec.dc.html`
- **Link:** <https://claude.ai/design/p/34e84995-d099-46dd-a784-3b762a09d6f4?file=Itinerary+Details+Spec.dc.html>
- **Re-fetch:** the `claude_design` MCP or the DesignSync tool — `get_file` against the project id above.

S4.3 archived its frames as verbatim `.dc.html` copies and that remains the better pattern where
the copy can be made faithfully. It is not attempted here: the file is a single 40 KB line of
inline-styled markup with SVG path data and typographic characters (`—`, `·`, `₱`, `–`), and a
copy that silently mangles one of those is worse than no copy — the fidelity rule sends the next
reader to *the markup* for the answer, so a corrupted archive would misinform exactly the person
it exists to serve. The link above resolves; the spec's "Design baseline" section transcribes
every binding string.

## Where the shipped build deviates from the frames, and why

The spec wins over the frames wherever they disagree — it is the ratified artifact and names each
deviation on the record. Two are worth restating, because a reader comparing frame to build will
notice them:

1. **Artboard 4's note "currency defaults silently from the traveler's preference" is superseded.**
   The default is **PHP**, server-side (founder, 2026-08-18 — spec decision 1). The frame's
   *drawing* is still correct: create shows no currency field. Only the annotation is stale, and
   the spec already flags it.

2. **The facts line renders two forms the frames do not draw: `From 12 Mar 2027` and
   `Until 19 Mar 2027`.** The frames draw only the both-dates and no-dates strings, and spec
   decision 7 pins those two exactly. But the editor deliberately allows **either date to be
   absent** (spec decision 9: "either date may be absent"), so a one-sided range is a state a
   traveler can actually reach — and the line has to say something honest about it. The wording is
   inherited from the retired `formatDates` helper rather than invented, so the vocabulary matches
   what the Details tab used to show. Recorded here rather than passed off as a choice the frames
   made, per the fidelity rule's "say so" clause.

3. **Three of the four artboards are now PARKED, not shipped** *(founder, 2026-08-19, on a live feedback pass after the story landed)*. Artboard **1**'s facts line and cog, artboard **1b**'s whole overflow menu, and artboard **2**'s date fields are built and correct but switched off behind `COG_IS_LIVE` and `DATE_FIELDS_ARE_LIVE`. Artboard **3** (the currency confirm) and artboard **2**'s currency picker ship — though the picker is an **inline dropdown** rather than the modal sheet the frame's annotation implies, on the same ruling. Artboard **4** (create mode) ships as drawn.

   Recorded here rather than left to a reader comparing frame to build: the frames are not wrong and the code is not missing — the surfaces are turned off. Each is one boolean from returning. ADR-028 carries the same amendment in canon.
