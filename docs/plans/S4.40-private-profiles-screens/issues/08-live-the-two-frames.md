# 08 — Live: the two frames on the traveler topic

**What to build:** a private owner with the Follow requests list open sees a new request appear without a refresh; an owner with their Followers list open sees a departure land the same way; the own stats follow. Two payload-less event types on the existing per-traveler topic, emitted after commit off the S4.39 domain events, and two client handlers that invalidate what they name (spec decision 12 and the API Contract's socket table; canvas contract C4).

**Blocked by:** 04, 05.

**Status:** ready-for-agent

- [ ] **Backend — the identity module's own topic listener**, in the shape of the invitation and join-queue topic classes, holding two event-type constants: **`follow-requests.changed`** and **`followers.changed`**. After commit, ids only, payload **null** (ADR-030 amendment B — the audience is one traveler): a request created → the target's `follow-requests.changed`; a pending request cancelled by the requester's delete → the target's; a request approved (each row of a flip-to-public batch included) or declined → the target's; a Follow edge created → the followee's `followers.changed`; a Follow edge removed, by unfollow or by remove-follower → the followee's. If the S4.39 code raises no domain event on cancellation, raise one, ids only, and keep it out of the demand set unless the founder says otherwise.
- [ ] **Backend ITs** with the recording fan-out, the Travelers-tab events IT as prior art: for each of the seven cases above, exactly the right frame on exactly the right traveler's topic and no other; a repeat follow and an idempotent delete emit nothing; the flip-to-public batch reaches the target. **Sabotage-checked** — drop one emit and exactly its assertion goes red — then restored. The full backend suite once, counts read from the summary with `failsafe:verify` appended; one Maven run at a time.
- [ ] **Client — two handlers in the delivery registry**: `follow-requests.changed` invalidates the requests inbox; `followers.changed` invalidates the follow lists and the own stats. No new subscription — the traveler topic is already subscribed at launch since S4.35; reconnect already marks stale.
- [ ] **Jest** for the handlers (the trip-events suite as prior art): frame → invalidations; an unknown type is still ignored.
- [ ] **Playwright, web, two browser contexts** (the live-travelers spec as prior art): t1 has Follow requests open; t4 asks through the API → the row appears without a refresh. t1 has own Followers open; t2 unfollows through the API → the row disappears and the count line moves. A socket-driven change plays M2 on arrival where a row is added; no exit motion is owed to a row the server removed.
- [ ] The pill on another traveler's profile and on a published page stays focus-fresh; nothing here subscribes a public surface.
- [ ] Process gates: full Jest before the push; the Playwright list check.
