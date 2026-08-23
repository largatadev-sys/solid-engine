# S4.30 — Onboarding you can leave

**Context anchor:** Epic 4 · identity module · S4.0 (the OTP gate and the onboarding flow this re-cuts) · S4.28/S4.29 (the invite link that surfaced it) · ADR-008 (additive-only /v1 — this story needs no API change at all) · ADR-031 (CI is the suite runner). Slice definition: founder bug report, 2026-08-23, from a walk through a shared invite link.

**Candidate-capability note:** none. Nothing here is a capability — leaving your own onboarding is governance of the app's front door, adds no footprint, and creates no data another traveler can see.

---

## Problem Statement

A traveler received an invite link, tapped it, signed in with Google, and was put through onboarding — on an account that had signed in with Google before. They did the walk twice and got the same result both times.

The behaviour is correct in the narrow sense and broken in every sense that matters. The gate routes to onboarding on exactly one input: `/v1/me` returning `onboardingCompleted: false`. And that flag is written by exactly one action anywhere in the system — the tap on the final button of the celebration screen. Not saving a handle, not saving interests, not saving a country. Three consequences compound:

1. **Any interruption is permanent.** Close the tab on screen five, follow the invite you were actually trying to open, lose signal — and the flow replays on **every** subsequent sign-in, for the life of the account. There is no other way to set the flag and no way to notice it is unset.

2. **There is no way out.** `destinationFor` returns the next step from every segment that is not `onboarding` itself, so a traveler who does not want to answer four screens of profile questions is held at the front door indefinitely. The only exit is compliance.

3. **Resuming is indistinguishable from restarting**, and it lies about where you are. `nextOnboardingStep` checks `handle`, then `interests`, then `country` — it never returns `goals`. So a traveler who left after step 1 comes back to "Step 3 of 4" having never seen step 2, which reads as lost progress; and one who left after step 2 comes back to the same screen, which reads as no progress at all.

**The invite path is where all three are worst, and it is now the most common way a stranger meets this app.** Someone is invited to a trip, taps the link, signs in — and must complete a four-step profile before seeing the trip they were invited to. The pending join survives the detour (it is stashed and spent on the way out), so nothing is lost; but the thing they came for is behind a wall they did not ask for and cannot climb over.

Two client-side defects sit alongside it and make the same symptom reachable by a second route:

4. **`meKeys.me` is the global key `['me']`, and nothing clears the query cache on sign-out.** On native, signing out and in as a different traveler serves the *previous* traveler's profile to the gate.

5. **The gate cannot self-correct once it is on `/onboarding/*`.** `destinationFor` returns `null` for that segment unconditionally, so a wrong entry — from (4), or from any future race — is permanent for the session even when the correct profile arrives a moment later.

## Solution

Onboarding stops being a gate and becomes a suggestion the traveler can decline, and completion stops depending on one tap.

- **An existing account gets a way out.** "Skip for now" completes onboarding server-side and lands the traveler wherever they were going. The remaining questions are all answerable later from Profile, which is already true today for every one of them. **A fresh signup does not get it and walks the whole flow** *(founder ruling, 2026-08-23)* — the relief is for people the app has already met and is asking twice, not for the front door itself.
- **The invite does not outrank onboarding, and this spec was wrong to propose that it should.** S4.28 decided the opposite deliberately — *"link joiners go through the full, unmodified onboarding — no trimmed path (rejected, not parked)"* — because a join request approved by an owner must not come from a half-built identity, and **nothing in the backend enforces that; the gate's ordering is the whole guarantee.** Reversing it would have removed the guarantee silently. Founder-confirmed on the same reasoning. See ticket 05, closed unbuilt.
- **Completion is recorded when the last data step saves**, so the celebration screen celebrates rather than commits. Leaving it by any means — back, a closed tab, a deep link — no longer costs the traveler the whole flow.
- **A resumed flow says it is resuming** and resumes at the first genuinely unanswered step, goals included.
- **An invite outranks onboarding.** A traveler arriving with a pending join sees the postcard first. Onboarding is offered after, not before.
- **The gate can always correct itself**, and the `me` cache can never belong to another traveler.

## User Stories

1. As a traveler who was invited to a trip, I want to see the trip when I tap the invite, so that signing in delivers what the link promised.
2. As an invited traveler, I want to decide about a profile after I have seen what I am joining, so that I am answering questions about something I have context for.
3. As a traveler part-way through onboarding, I want a "Skip for now" on every step, so that I am never held at the front door by questions I do not want to answer today.
4. As a traveler who skipped, I want to fill in my profile later from my own Profile screen, so that skipping costs me nothing permanent.
5. As a traveler who skipped, I want the app to stop asking on every sign-in, so that declining once means declining.
6. As a traveler whose session was interrupted mid-onboarding, I want my answers kept and the flow to resume where I stopped, so that an interruption costs me one screen and not four.
7. As a traveler resuming, I want to be told I am resuming, so that I do not read it as the app having lost my answers.
8. As a traveler resuming, I want to be told why I am starting part-way through, so that landing on "Step 3 of 4" reads as progress kept rather than a step taken from me.
9. As a traveler who answered every step, I want the completion recorded when I answered them, so that whether I tapped one final button does not decide whether I do it all again next week.
10. As a traveler on the celebration screen, I want to leave it any way I like — back, a deep link, closing the tab — without losing the flow I just finished.
11. As a traveler switching accounts on a shared device, I want the app to route on *my* profile, so that the previous traveler's unfinished onboarding is not handed to me.
12. As a traveler, I want a wrong redirect into onboarding to correct itself once the app knows better, so that a transient race is not a permanent session.
13. As a returning traveler who has completed onboarding, I want sign-in to go straight to where I was going, so that nothing about the flow is visible to me at all.
14. As the founder, I want a walk that proves an invited stranger reaches the postcard without onboarding in the way, so that the conversion path is verified rather than assumed.
15. As the founder, I want to know how many travelers skip and at which step, so that the flow's cost is measurable rather than argued about.

## Implementation Decisions

1. **No API change — this is entirely a client re-cut plus one call moved.** `POST` completion already exists (`TravelerProfileService.completeOnboarding`), it is idempotent (`Traveler` only sets `onboardingCompletedAt` when it is null), and `nextOnboardingStep` already returns `null` the moment the flag is set. **Skip is therefore the completion call with the questions unanswered** — no new endpoint, no new field, ADR-008 untouched. Say this out loud in the tickets, because the instinct is to add a `skipped` flag; the distinction between "finished" and "declined" is not one any surface asks for today, and inventing it costs an /v1 field that can never be removed.

2. **The gate's ordering changes so a pending join outranks an unfinished onboarding.** Today `destinationFor` returns the onboarding step from any non-onboarding segment. It should return the join route when a pending token is settled and present, and the onboarding step otherwise. `isJoinRoute` already short-circuits the gate, so a traveler who lands on the postcard stays there; leaving it is what surfaces the offer.

3. **Onboarding is offered after the invite, not skipped by it.** Completion is not implied by having a pending join — the traveler still has an unfinished flow, and the gate still routes them to it once the join is spent. What changes is only the order.

4. **The resume order does not change, and this spec was wrong to propose that it should.** An earlier draft had `nextOnboardingStep` gaining `goals` so the step number "stopped lying". It does not lie: **S4.12 decision 4 made zero goals a legal answer**, and **decision 5 removed goal emptiness from the resume predicate as its direct consequence** — because once choosing none is legal, `goals.length === 0` cannot distinguish *not asked* from *asked, chose none*, and a traveler who picks nothing and force-quits is returned to the goals step on every cold start forever. That is a ratified decision with its own guard (`onboardingGate.test.ts`, *"and no resumable profile shape lands on goals, however the later fields are filled"*), and reintroducing goals would re-open the exact bug it closed. **What story 8 actually needs is the resume signal from story 7, not a reordering** — a traveler who sees "Step 3 of 4" is being told the truth, and only needs to be told *why*.

5. **Completion moves to the travel-setup save.** The client calls completion when the last data step succeeds, then navigates to the celebration screen. The endpoint stays explicit — completion is not a side effect of `updateProfile`, which would make an unrelated PATCH carry a lifecycle change. The celebration screen's own button then only navigates.

6. **The gate is NOT taught to eject a completed traveler from `/onboarding/*`, and this spec was wrong to propose that too.** The draft wanted `destinationFor` to move on anyone standing on an onboarding screen whose profile says they are done. That breaks **Edit Profile**, which is the completed traveler deliberately opening `/onboarding/profile?mode=edit` — guarded by `onboardingGate.test.ts`, *"a completed traveler may still open an onboarding route, which is how Edit profile works"*. The gate sees only the first segment, so it cannot tell a traveler who navigated there from one it put there. **And after decision 7 there is nothing left to defend against:** the only ways a wrong `onboardingCompleted: false` reaches the gate are a stale cross-traveler cache (which 7 removes) and the server genuinely saying so (which is correct). Fix the cause, not the symptom — an ejection rule would be a permanent constraint bought to cover a hole that no longer exists.

7. **The `me` cache is emptied on sign-out.** `meKeys.me` is the constant `['me']`, which is correct as a key and wrong as a lifetime. Clearing the query client on sign-out is the smaller change than scoping every key by traveler id, and it is also the right one: *no* cached data from a previous traveler should survive into the next session, not just `me`.

8. **Register #2 analytics.** A skip emits an event naming the step it was taken from. This is the only way the flow's cost becomes measurable, and story 15 is the founder's ask.

## Testing Decisions

A good test here asserts what a traveler experiences, not how the routing computes it. The routing rules are a pure module and that is the seam — no component rendering, no navigator.

- **`destinationFor` / `nextOnboardingStep` (`mobile/src/onboarding/onboardingGate.ts`) is the one seam**, already covered by 27 cases in `mobile/__tests__/onboardingGate.test.ts`. Every rule in this spec is expressible there: pending-join-outranks-onboarding, resume ordering, self-correction, and the signed-out and unverified branches staying exactly as they are. Prior art for the exit path is `mobile/__tests__/onboardingExit.test.ts`, which already scans the onboarding directory so a new screen cannot escape its coverage — the skip control belongs under the same scan.
- **The backend needs no new test** and that is the point: no endpoint, no field, no migration. `completeOnboarding`'s idempotence is already exercised; if a ticket finds itself adding a backend test, the design has drifted from decision 1 and should be re-read before the test is written.
- **One e2e walk carries story 14** — an invited traveler with no completed onboarding reaches the postcard. `mobile/e2e` is the home; the pool's verified accounts supply the two travelers (`t1` owner, a fresh-profile tag as the invitee), and `seed-trip.js` supplies the trip.
- **The cache-clearing change earns a walk, not a unit test.** Its failure mode is cross-account bleed, which only exists once two sign-ins share a process — a device or preview check, not Jest.
- **Sabotage-check the resume ordering.** It is a table of conditions where a wrong answer still returns a plausible route, which is exactly the shape that passes a test written from the same wrong table.

## Out of Scope

- Any change to what onboarding *asks*. The four steps, their copy and their options are unchanged.
- Any distinction between "completed" and "skipped" in the data model (decision 1).
- Making onboarding mandatory for any surface. Nothing in the app gates on `onboardingCompleted` except this routing.
- The handle-claim question, if it lands as "leave it null" — see Further Notes.
- `app/+html.tsx` and the SPA's white boot gap, which is its own epic-map line.
- Repairing the reporting traveler's row on deployed dev. That is an operational one-off, not a story.

## Further Notes

**Two decisions are the founder's, and the tickets should not guess at either.**

- **D1 — does skipping claim the suggested handle, or leave it null?** *Recommendation reversed while writing the tickets: **leave it null**.* The first draft said claim it, on the reasoning that `suggestedHandle` is what a traveler gets by tapping Continue anyway. Two things found in the code beat that argument. **A null handle is already a first-class state, not a degraded one** — `profileMetaLine` omits the `@handle` line entirely rather than substituting anything, and the roster falls back to `displayName`, so nothing renders wrong and no email fragment is exposed. **And claiming introduces a failure mode skip must not have**: it needs a second call that can throw `HandleTakenException`, which would make "Skip for now" fail for reasons the traveler cannot understand or fix from that screen. Skipping should be the one action in the flow that cannot fail. The traveler sets a handle later from Profile, which is the premise of the whole story.

- **D2 — does the resume banner exist, or is the step number enough?** *Recommendation: a line, not a screen.* Story 7 is real — resuming looks like restarting — but a resume *screen* is a fifth step in a flow this spec exists to shorten. One line above the step indicator ("Picking up where you left off") costs nothing and answers it.

**What this story does not fix, and should say so at its gate.** A traveler who skips has no completed profile, and several surfaces read better with one — a roster row, an avatar stack, a postcard byline. Skipping is the right call for the front door and it moves that cost downstream, where the answer is a prompt in context rather than a wall at sign-in. That prompt is not this story.

**The diagnosis that produced this spec is worth keeping** because it was nearly missed. The reported symptom was "onboarding again after a Google sign-in from a shared link", and all three of Google, the shared link and the account's age were red herrings — the gate reads one field and nothing else. What made it findable was that `/onboarding/goals` is reachable from exactly one place in the codebase, so the reported step number pinned the path the traveler actually took. **A precise symptom is evidence; ask what could produce exactly that number before theorising about the mechanism.**
