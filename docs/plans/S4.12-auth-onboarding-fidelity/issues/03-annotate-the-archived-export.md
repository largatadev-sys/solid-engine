# 03 — Annotate the archived export so it stops misleading

**Status:** ready-for-agent

**What to build:** a reconciliation header on the archived Figma export, naming every element the build deliberately overrules and pointing at the ruling that overruled it (spec decision 7). **The export itself is not edited** — it is a point-in-time artifact, and the header sits above it.

**Why this is the largest durable item in the story.** The export has been superseded in nine places since S4.0 and says so nowhere. It reads as untouched baseline, so a reader arriving with the standing mock rule in hand — *where a mock exists, copy it* — correctly concludes the build is wrong in nine places. That is what happened on 2026-08-04: an afternoon spent re-deriving decisions that were already made and already correct. A superseded mock with no annotation is the same failure mode as a stale tracker — it misleads with authority.

**Blocked by:** nothing.

- [ ] The header names each **superseded element** and the decision that superseded it: the step-label collisions · Apple sign-in · the ToS consent line · the camera badge and "Upload Photo" · the palette and the CTA's radius · Google's presence on sign-up · the landing's inline sign-in form (spec decision 7, AC 11)
- [ ] It records the **three self-contradictions inside the drawing**, so the next reconciliation does not read the losing side as a missed detail (spec decision 7, AC 11):
  - the landing's near-borderless inputs against sign-up's bordered ones — same control, two treatments, two frames apart
  - the Google button's radius and shadow against every sibling control
  - goal rows declaring a height that clips their own content, where the shipped token is the height the content actually needs
- [ ] It records the items **settled at this story** (tagline, reveal glyph, reset placement, goals minimum, completion glyph) so the file is current, not merely historical
- [ ] The header states that **the export is archived input, not a live target** — a reader following the mock rule against it needs to know which parts still bind
- [ ] The 2026-08-04 render is **archived beside the spec** (spec AC 13)

**Do not:** edit the export's contents, renumber its steps, or "fix" its contradictions in place. Its value is that it is exactly what the designer handed over; the annotation carries everything else.

## Comments
