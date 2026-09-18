# 06: `chat` takes the proofs — the thread reads through `InAudience`, send takes its freeze from the fence in chat's own words

**What to build:** the chat module stops re-deriving the trip's state. The thread read takes `InAudience` (it already does — the type moves, nothing else); `send` takes the proof of a room that is open and a plan that is not frozen, minted through the refusal overload so the surface keeps its own answer: `fence.editable(member, ChatClosedException::new)` — `CHAT_CLOSED` on a published trip exactly as today, not-found on a deleted one. The hand copy — the `isPublished` check inside the service — is deleted; the module reads neither `PublicationState` nor the old doors afterwards. Behaviour-neutral by construction: same codes, same messages, same order. Spec decisions 8, 9; grilling Q7.

**Blocked by:** 03.

**Status:** ready-for-agent

- [ ] `send` takes a proof minted with chat's own refusal; the thread read takes `InAudience`; no method in the chat module takes a bare `Membership`
- [ ] The chat module imports neither `WriteFence`, `AudienceFence` nor `PublicationState`
- [ ] A member's send on a published trip answers `CHAT_CLOSED` with the same message; on an archived trip `ITINERARY_NOT_FOUND`; on a live trip the message lands — the chat ITs pass **unedited**
- [ ] Scoped `chat` ITs and the unit suite green; CI green on push

## Comments

*None yet.*
