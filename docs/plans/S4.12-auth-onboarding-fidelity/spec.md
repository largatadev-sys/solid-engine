# S4.12 — Auth & onboarding fidelity pass

**Status:** ready-for-agent · **Epic:** E4 · **Depends on:** S4.0 (shipped)

## The pull, on the record

The founder brought the sign-up/onboarding Figma export back to the table on 2026-08-04 for a render and a reconciliation. The render is archived beside this spec.

**The export turned out to be the same board S4.0 already grilled** — byte-identical frame positions (212 · 685 · 1158 · 1631 · 2104 · 2577 · 3050 · 3523), identical CTA strings, identical step labels including the broken run of three consecutive "Step 3 of 4". Verified rather than assumed; a revised export would have moved at least one of them. So this is not a second retrofit. S4.0's fourteen decisions stand, and nine of the differences between drawing and build are ruled by them.

What remains is a **fidelity pass**: five places where the build diverges from the frame with nothing on the record explaining why, plus a design record that still misleads.

**Two of the founder's three rulings at this session describe the build as it already stands**, and are recorded here so they are not raised a third time:

- *"Make sure the theme is applied"* — **already true, verified.** Every `.tsx` and `.ts` under `mobile/` was scanned for colour literals: zero outside `tokens.ts`. Screens consume tokens only, which is what makes ADR-016's values-only swap work.
- *"Step 1 should start after verification, through step 4 setup profile; the last screen should not have a step"* — **already true, exactly.** The gate numbers profile 1 · goals 2 · interests 3 · travel-setup 4, verification sits before the count, and the completion screen passes no step so the indicator renders nothing. This is S4.0 decision 1, shipped.

Both rulings were prompted by the render, which drew the **mock's** labels faithfully. The founder corrected the drawing. That is the finding: the mock in the repo has been superseded in nine places and says so nowhere, so every reader re-opens a settled question. Annotating it is the largest durable item in this story.

## Goal

The auth and onboarding screens match their frame everywhere no ruling says otherwise, the two places where copy and behaviour contradict each other are resolved, and the design record stops misleading the next reader.

## Locked decisions *(founder, 2026-08-04)*

### 1 · The mock's tagline is adopted

`Plan less. Experience more.` replaces `Plan together. Travel better.` on the welcome screen. Two taglines were in circulation on the first screen anyone sees, neither carrying a ruling; the founder settled it toward the frame. Copy only — no layout change.

### 2 · The password reveal becomes the eye icon the frame draws

Both auth screens. Applies the standing mock rule (*founder, 2026-07-31 — "if a frame draws a cog wheel, ship a cog wheel"*). The existing accessibility labels — "Show password" / "Hide password" — are **unchanged**, so nothing is lost to a screen reader; only the visible affordance changes. This widens the shared field component's trailing slot from text-only to text-or-icon, which is the smallest change that serves both callers.

### 3 · "Forgot password?" moves to the field, right-aligned

Under the password field, right-aligned, at the frame's weight — not centred below the primary action. The frame expressed this on a landing screen that no longer exists (S4.0 split sign-in onto its own screen), so the *placement* carries over even though the *screen* did not. Its existing behaviour is untouched: still inert on an empty email, still sends through the same repository call, still reports through the same notice line.

### 4 · The goals minimum is dropped; "Select all that apply" becomes literally true

The subtitle invited zero answers while the button refused them. The founder resolved it toward the copy: **zero goals is a valid answer and Continue is always live.** The interests step is unaffected — it keeps "Pick at least 3" and its minimum, because there the copy and the rule already agree.

Cost accepted on the record: the "Earn from my itineraries" signal (S4.0 decision 5) gets thinner, since a traveller can now pass the step without answering. The signal was never a sample of everyone — it is a count of people who chose it — so a smaller denominator is a legible cost, not a broken measurement.

### 5 · The resume gate stops keying on goal emptiness — a consequence of 4, not a separate feature

**This is the trap decision 4 creates, and it is invisible to any test that walks the flow straight through.** The gate resolves "where does this traveller resume?" by asking each step whether its data is absent — `handle === null`, `interests.length === 0`, `country === null`. Once an empty goal list is a *legal answer*, that predicate stops distinguishing **not asked** from **asked, chose none**, and a traveller who picks nothing and then force-quits is returned to the goals step on every cold start. They can still finish in one sitting, which is exactly why no straight-through walk would catch it.

**Resolution: the goals step leaves the gate's resume ladder.** It remains in the forward walk — profile still routes to goals, goals still routes to interests — but an interrupted traveller resumes at interests. The cost is one skipped optional question in the interrupted case, which is proportionate for a step that is optional and, per S4.0 decision 6, still has no reader.

**Rejected, on the record:** making the stored goal list nullable so `null` means *not asked* and `[]` means *asked, chose none*. More truthful, and the right shape the day something reads goals — but it is a column-semantics change plus an API change for a step nothing consumes yet, against a dial that reads MVP grade outside the ledger and the guard. Recorded here so the option is found rather than re-derived when a reader arrives.

### 6 · The completion screen ships the icon the frame draws

`party-popper`, not `sparkle`. The standing mock rule again, and the cheapest item in the story: **the glyph already exists** in the icon module and already renders on the published-trip screen. `sparkle` has exactly one consumer, so it leaves with the change rather than lingering as dead code — the E1 gate's precedent.

### 7 · The mock file is annotated; the code is not changed to match it

The export keeps its place as archived design input and is **not edited** — it is a point-in-time artifact. It gains a **reconciliation header** naming every element the build deliberately overrules and pointing at the ruling: the step-label collisions, Apple, the consent line, the upload affordance, the palette, and the Google button's shape. Three self-contradictions inside the drawing are recorded in the same header — the landing's near-borderless inputs against sign-up's bordered ones, the Google button's radius against every sibling, and goal rows declaring a height that clips their own content — so the next reconciliation does not read the losing side as a missed detail.

**Why this is the largest durable item:** a superseded mock with no annotation is the same failure as a stale tracker. It misleads with authority, and it cost this session an afternoon to re-derive what S4.0 had already settled.

### 8 · Candidate-capability note *(ADR-009's standing duty)*

**None.** Every act here is copy, a glyph, an alignment, or a client-side routing predicate. Nothing consumes a meterable resource, nothing grows the traveller's footprint, and profile writes update the traveller's own row — the same reasoning S4.0 recorded, unchanged. A considered "no", not a gap.

## Backend scope

**None.** No migration, no endpoint, no contract change, no analytics change. The goals field keeps its shape and its writer; only the client's willingness to submit an empty list changes, and an empty list was always legal to store. ADR-008 is not engaged in either direction.

## Mobile scope

Copy on the welcome screen. The shared field component's trailing slot widens to carry an icon as well as text, and both auth screens adopt it. The sign-in screen re-places its reset link. The goal-selection rule and the gate's resume ladder change in the two pure onboarding modules that already own them. The completion screen swaps its glyph and the retired one leaves the icon module. Screens keep consuming tokens only — **no colour literal may be introduced**, which is a standing rule and an acceptance criterion here because this story touches the screens ADR-016's swap was proven on.

## Seams

All existing — **no new seam is introduced**, which is the property that keeps this story small.

- The **goal-selection rule** and the **resume ladder** are pure functions in the two onboarding modules, each already covered by its own unit-test file. These are the highest seams available and carry decisions 4 and 5 entirely.
- The **icon module** is the single place that owns every glyph, so decisions 2 and 6 land in one file plus their callers.
- The **shared field component** already owns the trailing slot for both auth screens, so decision 2's widening has one implementation and two consumers.
- Copy and alignment are screen-local and close on the device and the preview.

## Harness impact

None to the pool or the seeding scripts, and **none to `drive-preview.js`** — see the correction below.

**Correction, 2026-08-04, found at the code review:** this section first claimed the driver "already walks the flow" and that its goals-step assertion needed flipping. **Both halves were false.** `drive-preview.js` takes its entire walk from CLI arguments and hard-codes no step for any screen, so it has never asserted anything about goals and there is no assertion to flip. AC 12 stands as written — it is a *run* of the driver against the preview container, closed by observing the walk complete with zero goals selected, not a code change.

## Acceptance criteria

| # | Criterion | Closed by |
|---|---|---|
| 1 | Welcome reads **"Plan less. Experience more."**; no other welcome copy moves | Device + preview |
| 2 | Both auth screens render the **eye icon** in the password field; tapping still reveals and re-hides; the accessibility labels are unchanged | Unit + device |
| 3 | **"Forgot password?"** sits right-aligned under the password field; still inert on an empty email; a valid address still sends and still reports through the existing notice | Device |
| 4 | The goals step: **Continue is live with zero selections**; the subtitle still reads "Select all that apply"; a zero-goal traveller saves and advances to interests | Unit + device |
| 5 | Interests are **untouched** — "Pick at least 3" and its minimum both still hold | Unit |
| 6 | **The resume ladder no longer keys on goal emptiness**: a traveller with a handle, zero goals and zero interests resolves to *interests*. **Sabotage-verified** — the test fails against the current ladder | Unit |
| 7 | **The trap itself, on a device:** a traveller picks no goals, force-quits mid-flow, relaunches, and is **not** returned to the goals step | Device |
| 8 | Completion renders **party-popper**; `sparkle` is gone from the icon module with no remaining consumer, and the type union no longer offers it | Unit + device |
| 9 | The step model is **unchanged and pinned**: profile 1 · goals 2 · interests 3 · travel-setup 4, verification outside the count, and the completion screen renders **no** step number and **no** progress bar | Unit |
| 10 | **No colour literal is introduced** anywhere under `mobile/` outside the token module | Repo scan |
| 11 | The archived export carries its **reconciliation header**; every superseded element names its ruling, and the three self-contradictions are recorded | Doc review |
| 12 | Web preview container: the full email sign-up → code → onboarding → My Trips walk still completes, goals step included, with zero goals selected | `drive-preview.js` |
| 13 | The render is archived beside this spec | File check |

## Out of scope

Everything S4.0 deliberately omitted stays omitted, unchanged and for the same reasons: **Apple sign-in** (iOS activation, ADR-010) · **the ToS/Privacy consent line** (pre-alpha, with the documents) · **photo upload and its camera badge** (S3.3 — absent, not disabled). Also out: any backend change · any change to verification, handles, or the routing gate beyond decision 5's single predicate · the landing-screen restructure the frame draws (S4.0 decision 1 split it deliberately) · reading goals or interests anywhere (S4.3's call, untouched).

## Comments
