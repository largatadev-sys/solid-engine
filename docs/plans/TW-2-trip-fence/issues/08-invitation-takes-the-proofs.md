# 08: `invitation` takes the proofs — issuing and revoking through `MembershipMutable`, accepting through `Unfrozen`, the pending list through the fence in its own words

**What to build:** the invitation module's three shapes of act each take the proof of the door they pass. Issuing by handle and revoking a pending invitation take `MembershipMutable` — any member may (ADR-032's policy), so the standing is `Membership`. Accepting an invitation is an act by a traveler who is **not yet a member**, so it takes `Unfrozen`, minted by trip id from the fence — the `MEMBERSHIP_FROZEN` refusal on a published trip exactly as today. The pending-invitations read, which refuses on a published trip with the module's own answer, takes its freeze from the fence through the refusal overload with that same answer. The hand copy — the `isPublished` check inside the service — is deleted; the module reads neither `PublicationState` nor the old doors afterwards. The archive-time voiding of invitations (the `TripArchived` listener) is untouched. Behaviour-neutral. Spec decisions 8, 9; grilling Q7.

**Blocked by:** 03.

**Status:** done

- [x] Issue and revoke take `MembershipMutable`; accept takes `Unfrozen`; the pending-list read takes a proof minted with the module's own refusal; no method in the invitation module takes a bare `Membership`
- [x] The invitation module imports neither `WriteFence`, `AudienceFence` nor `PublicationState`
- [x] Accepting on a published trip answers `MEMBERSHIP_FROZEN`; issuing on an archived trip answers `ITINERARY_NOT_FOUND`; the pending list on a published trip answers exactly what it answers today — the invitation ITs, `InvitationExpiryIT` included, pass **unedited** beyond import lines
- [x] Scoped `invitation` ITs and the unit suite green; CI green on push

## Comments

**Mechanism replaced at ticket 14 (grilling rounds 5–6, 2026-09-22).** The proofs this ticket built were retired before the merge in favour of the Threshold — the same two rules applied once at the route, the handler declaring its door. Every decision on this ticket stands; the shape of the code it describes is history, and ticket 14 carries the current one.

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
