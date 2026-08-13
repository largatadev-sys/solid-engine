# S4.23 — Archive posture: the mask covers writes, the diary list joins the fence, and stranger surfaces show handles

**Status:** specced — awaiting owner review *(flips to ready-for-agent at the owner's pass — the S4.19/S4.20 precedent)* · **Epic:** E4 · **Depends on:** nothing in flight — S1.9 (archive + write fence), S4.1/ADR-017 (the audience ladder), S3.1 (author-only diaries), S4.21 (the profile diary tab) and S4.22 (the feed) are all shipped. Sequencing note: the byline strand touches feed modules S4.3 (in flight, spec'd on its own branch) may extend — this story is small and lands first; S4.3 rebases over it.

**Immutable point-in-time intent** (issue-tracker rule): if intent changes during implementation, append to `## Comments`; never rewrite this body.

> **Context anchor.** ADR-017 (the audience ladder — **amended by this story on the record: the mask extends to writes**) · ADR-008 (additive-only — **waiver recorded below** for two shipped-semantics changes, the founders-own-clients ground ADR-018 established) · Artifact 03 (the guard; every workspace act takes the resolved Membership) · ADR-024 (the postcard model — diaries are author-only) · ADR-025 (the public feed, strangers-see-strangers) · the 2026-08-13 fence review (the three backlog lines this story discharges) · the S4.22 design baseline (the byline is a **named founder override** of its mock, recorded below).

## The pull, on the record

The 2026-08-13 fence fix (the archived-diary-doors commit) minted three backlog lines it deliberately did not fix: the unfenced `/v1/me/diary/trips` (**active — broken in the product today**: the profile diary tab lists an archived trip whose expansion 404s and renders as a silently dead card), the service reads that carry no authorization of their own, and the 409-vs-404 posture contradiction the log called a product call. The founder pulled all three the same day and answered the product call at the grilling (eight questions, one fact round). Mid-grilling the founder added a fourth strand: **the home feed shows only the handle, never the whole name** — a privacy posture for the app's first strangers-see-strangers surface.

## Goal

An archived trip tells one story to a non-owner member — *it does not exist for you* — through every door, read or write; the diary list promises only what its per-trip reads can serve; a failed load looks like a failure instead of an empty diary; the fence cannot be bypassed by a future caller; and strangers on the feed see handles, not names.

## Locked decisions *(founder, 2026-08-13, in grilling order)*

### 1 · The mask extends to writes — one posture, every door

A non-owner member's **write** to an archived trip answers the same not-found mask as their read. The owner keeps the honest archived refusal — the trip legitimately exists for them, and the refusal should explain itself. **The mask answers before any finer permission refusal** for a non-owner member on an archived trip: a permission answer names the trip's existence, so a mask that answers second is no mask. Live-trip permission refusals are untouched. Self-leave stays open (S1.9's rule, pinned twice — a member must be able to leave a trip archived under them). Acts closed by archive-time voiding (offer/invite acceptance) keep their existing answers — different mechanism, not this story's door. The pre-ADR-017 pin that states the old posture as a sentence (*"an archived trip tells a member it is frozen"*) flips and renames to state the new one: it encoded the world where members still had sight of archived trips, which ADR-017 ended.

### 2 · The diary list is a projection of the fence

`/v1/me/diary/trips` returns exactly the trips whose diary the caller can open: **archived excluded unless the caller owns the trip** (mirroring the per-trip fence and the My Trips archived-tab precedent, which is already owner-only by query shape), and **trips the caller has left or been removed from excluded outright** (the same dead card by a different door — the membership join the archive filter needs anyway drops them naturally). The owner keeps sight of their archived trips' diaries. One rule the next surface can follow without asking.

### 3 · The diary tab stops swallowing

`ProfileDiaryTab` renders failure as failure: a failed trips fetch shows a visible error with retry — today it renders the *empty-diary* text, an error dressed as an answer — and a failed per-trip expansion shows an inline error instead of an empty section. The precedent is one screen over: the trip-diary screen already renders a screen message on error.

### 4 · The fence mints proof, and the service reads require it

`requireInAudience` returns a proof value only the fence can construct, and the three service reads whose fence was hoisted to their single controller caller — the dump pool's list, the diary's per-trip list and single-entry read — take that proof instead of a bare Membership. A second caller that skips the fence stops compiling. The owner's recorded one-fence-per-request choice stands; the coverage scan is untouched. *(Pattern, named per P9: proof-carrying parameter — the type system carries the invariant a convention used to carry. The authorization guard runs at Full rigor by standing rule, which is what buys this over a second runtime check.)*

### 5 · Stranger surfaces show handles, never names

Every stranger-facing feed surface — the feed card byline and the public trip diary header behind it — shows **@handle**. An author with no handle renders as **"A traveler"**, never their display name: this is a privacy posture (don't leak names to strangers), not an aesthetic, so the fallback must not defeat it. Membership surfaces (roster, travelers, own profile) keep display names — those are people you chose to travel with. Everything derived from identity on the stranger surfaces follows the shown identity: avatar initials and accessibility labels derive from the handle or the anonymous fallback, not from the hidden name.

## Asserted defaults *(stated at the grilling's close, unchallenged)*

- An owner's archived trips render in the diary tab like any other trip — no badge. The S4.21 mock is the baseline and draws no archived treatment.
- The diary-trips read stays identity-scoped — it is the one read whose authorization *is* its query (like the exempted own-lists), so it takes no proof parameter; its fence is decision 2's join.

## Mechanics *(the decisions' consequences, settled at the grilling)*

- The write fence already takes the resolved Membership, so posture needs no new inputs: non-owner + frozen answers the read mask's not-found; owner + frozen keeps the archived conflict. Call sites where a permission refusal currently precedes the fence reorder so the fence answers first — that is the whole of decision 1's ordering rule.
- The diary-trips query joins membership and workspace state; the cursor is a keyset on entry id and is undisturbed by the extra predicates. No wire-shape change — the same page envelope, fewer rows.
- The proof type is constructible only by the fence (package-scoped), carries the Membership it cleared, and changes no runtime behavior — existing ITs pin that live-trip reads are unchanged.
- The byline needs no backend work: the feed and public-diary wires already carry both handle and display name. The change is in the anatomy modules that derive the shown identity, and in what initials and accessibility labels derive from.

## Wire changes — none additive; two semantics changes under an ADR-008 waiver

No endpoint, field, or shape is added, renamed or retyped. Two **shipped behaviors** change meaning, waived on the record on the standing founders-own-clients ground (the ADR-018 precedent, renewed at the 2026-08-13 fence fix):

1. A non-owner member's write to an archived trip: 409 `TRIP_ARCHIVED` → the not-found mask (and, on the same trip, permission 403s now answer as the mask too).
2. `/v1/me/diary/trips` returns fewer rows: a member's archived trips and all departed trips leave the list.

Both restore intended authorization semantics — the current contract (a list that promises reads its own fence refuses; a mask with a louder door beside it) is the broken one.

## Candidate-capability note *(ADR-009)*

None — all four strands are authorization posture or presentation. Governance fails the potentially-gated test by definition; nothing here is a capability, grows footprint, or could ever be tiered.

## Deviations from the mock

The S4.22 baseline (the Claude Design home-feed project) draws the byline as the author's name. **Decision 5 overrides it by founder ruling** (2026-08-13, mid-grilling) — the frame's byline slot renders the handle. Everything else about the card is untouched.

## Acceptance criteria

1. Every fenced write family — day and activity writes, plan save, editing-session acquire, diary post/recaption/photo-remove/delete, dump add/remove, invite issuance and revoke, member removal, ownership offer and revoke — answers a **non-owner member** on an archived trip with the read mask's not-found. The renamed pins state the posture (IT).
2. On an archived trip, a non-owner member's permission refusal is masked too: the two ordering pins' member arms flip from 403 to the mask; the same acts on a **live** trip still answer 403 (IT).
3. The **owner's** writes on their archived trip still answer 409 `TRIP_ARCHIVED` everywhere they do today — the seventeen-endpoint pin stays green (IT).
4. Self-leave on an archived trip still answers 204 while the trip stays masked from the leaver; voided offer/invite acceptance answers are unchanged (IT, existing pins).
5. `/v1/me/diary/trips`: a non-owner member's archived trip is absent; the owner's archived trip is present (the existing owner pin stays green); a departed/removed trip is absent; live-trip rows and the cursor envelope are unchanged (new IT beside the existing diary contract family).
6. The profile diary tab renders a visible error state with retry when the trips fetch fails, and an inline error when an expansion fails — neither renders as "no diaries yet" or an empty section (Jest, the trip-diary-screen precedent).
7. The feed card byline and the public trip diary header render `@handle`; a handle-less author renders "A traveler"; the display name appears in neither, nor in the initials or accessibility labels derived there (Jest on the anatomy modules; walk assertion against the seeded demo data).
8. The three service reads require the fence's proof — a fence-skipping caller does not compile — and live-trip behavior is unchanged: the existing contract ITs and the coverage scan pass without modification (structural + IT).
9. Story gate on the standing three rungs: full backend ITs (counts read from the summary), full mobile suite + typecheck, `smoke-all`, the feed and diary walks green with the byline assertions updated, and an emulator pass — the byline is a trailing-text-in-a-row change, the exact class of defect only a phone frame shows.

## Testing decisions *(the seams — one new, the rest existing; confirmed at the grilling, Q6)*

Backend: the existing HTTP-seam IT families on the singleton container — the archive-fence family (member/owner arms per act), the audience-ladder family (mask semantics), the diary and dump contract families (per-surface behavior). The diary-list fix gets its own IT in the contract family: three arms (member-archived absent, owner-archived present, departed absent) plus the untouched-cursor assertion. **The one new seam is the proof type** — deliberately a compile-time seam, so it needs no runtime test beyond the existing ITs staying green. Mobile: pure-module Jest on the anatomy and state modules (shown identity, error states) — the walk asserts the rendered result on the feed. What makes a good test here: assert the wire answer or the rendered surface, never which internal check produced it — the mask's whole point is that two different refusals answer identically.

## Out of scope

The coverage-scan exemption map (its backlog line's trigger names "the next story that touches the fence" — **the founder held it out of this pull deliberately**; the line re-arms for the next fence-touching story) · the departed-member postcard strand this grilling surfaced (shared postcards outlive membership on the public feed with no withdrawal path — minted as its own backlog line; deciding it touches ADR-024/ADR-025 and earns a grilling) · the Firebase-orphan and moderation lines (parked, unchanged) · unarchive semantics (untouched) · display names on membership surfaces (kept by design) · any entitlement code (ADR-009, seam parked).
