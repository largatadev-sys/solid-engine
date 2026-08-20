# 03 — Subscribe through the guard; membership eviction

**What to build:** topic subscription as an authorization act, and the eviction that keeps it true when membership changes. This touches isolation semantics — the design is the spec's decision 5, ruled by the owner; build exactly that.

**Blocked by:** 02 — the session registry subscriptions attach to.

**Status:** done

- [x] Topic parser: `itinerary:{id}:{channel}` → itinerary id; unknown shapes answer the error frame. Topic names are parsed, never trusted.
- [x] Subscribe resolves the Membership through the guard (Artifact 03) exactly as a service method would; a non-member's subscribe answers the **masked** refusal (the not-found posture every workspace read has); a member's answers `{action: "subscribed", topic}`.
- [x] Subscriptions are keyed by membership: the registry can answer "every session this membership holds on this trip's topics".
- [x] Eviction: membership hard-delete (S1.5 leave/removal) raises the existing flow's event; an AFTER_COMMIT listener closes that member's subscriptions to the trip's topics. Same transactional posture as the lease release the flow already does.
- [x] Unsubscribe frame: releases the subscription, acks `{action: "unsubscribed", topic}`.
- [x] ITs: guard-family on the socket (member acks, non-member masked — re-asserted per channel as channels appear) · eviction (subscribe as t2, remove t2, publish on the topic, assert t2's socket receives nothing and the subscription is gone) · departure-voids parity with the S1.5 lease-release IT family.
