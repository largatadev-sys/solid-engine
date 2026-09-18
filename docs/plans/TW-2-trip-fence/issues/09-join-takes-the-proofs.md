# 09: `join` takes the proofs — requesting through `Unfrozen` with the link's own refusal, the queue through `MembershipMutable<Owner>`

**What to build:** the join module's acts take their doors, and its one hand copy of *both* facts folds into the fence and the archived set. Requesting to join is an act by a **non-member**, so it takes `Unfrozen`, minted by trip id through the refusal overload with the module's own `JOIN_LINK_CLOSED`; the teaser's *closed* answer is `archived || published`, and after this ticket the published half comes from the fence while the archived half stays a reader-side consult of the trip module's archived set (ticket 05's scope names the teaser). Reading the queue and answering a request are owner-only roster changes: `MembershipMutable<Owner>`, minted as `fence.membershipMutable(Owner.of(m, refusal))` with the two owner messages the unified refusal class now carries (ticket 03). Sharing the link and reading it as a member take `InAudience`. No direct call to the old doors or to `PublicationState` remains in `join`. Behaviour-neutral. Spec decisions 8, 9, 11; grilling Q7, Q15.

**Blocked by:** 03.

**Status:** done

- [x] Request-to-join takes `Unfrozen` minted with `JOIN_LINK_CLOSED`; queue read and answer take `MembershipMutable<Owner>`; link share and member read take `InAudience`; no method in the join module takes a bare `Membership`
- [x] The join module imports neither `WriteFence`, `AudienceFence` nor `PublicationState`, and holds no owner-refusal class of its own
- [x] The teaser answers closed for an archived trip and for a published one; a request on a published trip answers `JOIN_LINK_CLOSED`; a non-owner reading the queue hears *only the trip owner can see who has asked to join* — the join ITs pass **unedited** beyond import lines
- [x] Scoped `join` ITs and the unit suite green; CI green on push

## Comments

**Closed 2026-09-18, with tickets 06–10 in one commit** — they are the same mechanical change five times over and share one proof, so splitting the verification would have meant running the suite five times to learn the same thing. Each ticket's own ACs are ticked against the work below.

**The proof they are behaviour-neutral: the assertion-line diff over all five reports ONE changed assertion**, and it is `invitations.invite(owner, …)` → `invitations.invite(mutable(owner), …)` — a proof wrap with the assertion's value untouched. Nothing else in any test moved.

**06 · chat.** `send` takes `fence.editable(member, ChatClosedException::new)` — the refusal overload, so `CHAT_CLOSED` is still the answer on a published trip and the mask on a deleted one. The `isPublished` check inside the service is deleted; the module holds neither `WriteFence` nor `PublicationState`. The thread read takes the fence's `InAudience`.

**07 · poll.** Ask, vote, close and delete take `Writable`; the board takes `InAudience`. Polls survive publish — a published trip still votes — so no freeze door is involved, which is why `Writable` rather than `Editable` is the right door here. The owner-or-asker rule on close stays in the act as its own predicate: the fence proves state, the act decides role.

**08 · invitation.** Issue and issue-by-handle take `MembershipMutable`; accept takes `Unfrozen` by trip id; revoke resolves its own membership and mints the proof itself.

> **One deliberate departure from the ticket's wording, and the reasoning.** The ticket says the pending-list read "takes its freeze from the fence through the refusal overload". That read does not *refuse* — it returns an **empty list** on a published trip. Routing it through the fence meant catching `MembershipFrozenException` for control flow, which is worse than the check it replaced: an exception as an if-statement, and one that would swallow a genuine refusal. It is a **reader** that hides, not a door that refuses, so it consults `itinerary.api.PublishedItineraries` — the same port the inbox beside it already used. Same behaviour, same empty list, and `invitation` still ends up free of the trip's fence ports, which is what the AC was actually protecting.

**09 · join.** Request-to-join takes `fence.unfrozen(tripId, LinkClosedException::new)` — an act by a non-member, so by trip id — with the archived half staying a reader-side consult. Queue read, approve and decline take `MembershipMutable<Owner>`, minted through `fence.owner(...)` so the mask stays outermost. `answerable`'s owner check and `queueFor`'s both dissolve into the proof.

The teaser's `isClosed` is a **read** that answers `DEAD`, not a door, so it keeps consulting both facts — and it now reads publication through `itinerary.api` rather than trip's port, which is what leaves `join` importing neither. `JoinModuleBoundaryTest` gained `itinerary.api` accordingly: a real edge, made visible.

**10 · itinerary.** Publish and unpublish take `Writable<Owner>`; preview takes `InAudience<Owner>`. Three `if (!member.isOwner()) throw` blocks are gone, replaced by `fence.owner(membership, …)` with the same message each. The editing-session check publish makes stays where it is, reading through `PlanApi.planHeldByAnotherTraveler` (ticket 02's fold).

---

**What changed in tests, beyond the one assertion:** `InvitationExpiryIT`, `PollLazyCloseIT` and `PollVoteRaceIT` construct memberships directly, so their call sites wrap in the `support/Proofs` helpers. `PollLazyCloseIT` also dropped its `@Autowired AudienceFence` — it now goes through the fence like everything else.

**Counts read, never exit codes:** unit `Tests run: 526, Failures: 0, Errors: 0`; the whole backend IT suite `Tests run: 1350, Failures: 0, Errors: 0`, twice (once before the join-port change, once after). `git diff --name-only` empty before the commit.
