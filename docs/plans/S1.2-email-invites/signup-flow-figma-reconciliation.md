# Read this before treating `signup flow from figma` as a target

**The export beside this file is archived design input, not a live specification.** It is the 07/16 board, and it is exactly what the designer handed over — deliberately unedited, so it stays a faithful point-in-time artifact.

**The build deliberately overrules it in nine places.** Every one of them is a founder ruling, not drift. This file exists because the export says none of that, and a reader arriving with the standing mock rule in hand — *where a mock exists, copy it, screen and icon both* — will correctly conclude the build is wrong nine times over. That happened on **2026-08-04**: the board was brought back for a fresh reconciliation, and an afternoon went into re-deriving decisions S4.0 had already made and already got right.

A superseded mock with no annotation is the same failure as a stale tracker. It misleads with authority.

**Consumed by:** S4.0 (the full retrofit) · S4.12 (the fidelity pass). Renders archived beside each.

---

## Where the build deliberately departs from the drawing

| The frame draws | The build ships | Ruling |
|---|---|---|
| The landing carries the sign-in form inline — one screen doing branding, credentials, social and the sign-up link | Three screens: `welcome` → `sign-in` / `sign-up` | S4.0 decision 1 |
| “Sign in with Apple”, above the Google button | Nothing — Apple is absent | S4.0 decision 3 · **ADR-010** (the Apple mandate applies only on iOS; the alpha is Android-only) |
| Sign-up has no social buttons at all | The Google doorway renders on **both** sign-up and sign-in | S4.0 decision 3 |
| “By continuing, you agree to our Terms of Service and Privacy Policy.” | Nothing — the line is absent | S4.0 decision 9 (no consent line until the documents exist; a link to nothing is worse than no line) |
| A camera badge on the avatar, and “Upload Photo” beneath it | The avatar only — Google photo, or initials | S4.0 decision 8 (the affordance is **absent, not disabled**, until S3.3) |
| Step 2 of 4 → 3 of 4 → 3 of 4 → 3 of 4 → 4 of 4 | profile **1** · goals **2** · interests **3** · travel-setup **4**; verification before the count, completion outside it | S4.0 decision 1 · **re-confirmed by the founder 2026-08-04** |
| Black CTAs at 4px radius; one orange `#FF751F` on “Forgot password?” | Terracotta `#D96C4A` CTAs at 12px radius, terracotta as the only accent | S4.0 decision 10 · **ADR-016**, which explicitly supersedes this board's orange as brand evidence |
| Completion is icon + two lines + one button | The same, plus a summary card | S4.0 decision 6 (the summary claims only true things) |
| “Earn from my itineraries” as the fifth goal | Present — stored and analytics-measured | S4.0 decision 5 (ships as **signal-gathering only**, narrowing the 2026-07-17 cut rather than voiding it) |

## Where the drawing contradicts itself

Recorded so the next reconciliation does not read the losing side as a missed detail. The build had to pick in each case.

1. **The same input control, two treatments, two frames apart.** The landing's fields are `1px #F7F7F7` at `12px` radius — nearly borderless. Sign-up, create-profile and travel-setup use `1px #8F8F8F` at `4px`. One shared field component ships; it cannot be both.
2. **The Google button is `8px` with a drop shadow** while every sibling control on the board is `4px` and flat. Most likely an unmodified vendor component pasted in. Google's brand guidelines do constrain this button, so an exception here may be legitimate — but it should be stated rather than inferred.
3. **Goal rows declare `height: 50px` around `padding: 20px` and a `32px` icon** — 72px of content in a 50px box, which Figma clips silently. The shipped token is `72`, which is what the content actually needs. **The build is right and the frame is wrong.**

## Settled at S4.12 *(founder, 2026-08-04)*

Five differences that traced to no ruling anywhere. Four resolved toward the frame, one toward the frame's copy.

- **Tagline** — the frame's *“Plan less. Experience more.”* is adopted, replacing *“Plan together. Travel better.”*
- **Password reveal** — the frame's eye icon replaces the words “Show” / “Hide”; the accessibility labels are unchanged, so nothing is lost to a screen reader
- **“Forgot password?”** — right-aligned under the password field, at the frame's weight. The frame expressed this on a landing that no longer exists, so the *placement* carries over even though the *screen* did not
- **Completion glyph** — `party-popper`, as the frame names it
- **The goals minimum is dropped** — the frame's *“Select all that apply”* becomes literally true, and zero is a valid answer. **This one reaches into behaviour:** the resume gate had been reading an empty goal list as *“hasn't done this step”*, so goals left the resume ladder (S4.12 decision 5)

## What is still open

Nothing on this board. Every element is either shipped, ruled out with a trigger, or settled above.

The three deliberate omissions keep their own triggers and are **not** gaps: **Apple sign-in** at the iOS activation (ADR-010) · **the ToS/Privacy line** pre-alpha, with the documents · **photo upload and its camera badge** at S3.3.
