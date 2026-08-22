# 11 — The pending-request card on Trips, and withdrawing

**What to build:** the missing half of C2's second consent direction. A handle invitation surfaces as a frame-6 card on Trips; a join request surfaces **nowhere** — the canvas covered that with "they get a notification", and no notification system exists. So a traveler asks to join and the app tells them nothing until the trip either appears or doesn't. This ticket gives the request the same card, in a waiting state, and a way to take it back.

**Blocked by:** 02 (the join module), 03 (the inbox card this reuses).

**Status:** ready-for-agent

## Backend

- [ ] **`GET /v1/join-requests`** — the viewer's own **pending** requests. Every join route today is owner-scoped and keyed by trip (`/v1/itineraries/{id}/join-requests`), so a requester holds no id it is allowed to query and the client has nothing to read; this is the requester-scoped mirror of `GET /v1/invitations`. Scoped **by requester**, never by trip: a traveler sees only rows whose `travelerId` is theirs.
- [ ] Its rows carry the **same teaser fields the inbox card renders** — trip title, destination, start/end dates, cover reference, traveler count, going preview, and `requestedAt`. Nothing else: this is a teaser for a trip the viewer is **not** a member of, so it must not leak roster names, plan content, or anything the `/join` postcard is forbidden to show. Assert the absence, not just the presence.
- [ ] Its cover is served through a **capability-scoped route authorized by the request** (the pattern ticket 02 established for the token- and invitation-scoped covers) — never a members-only media path, and refused once the request is no longer pending.
- [ ] **Withdraw** — the requester retracts their own pending request. `WITHDRAWN` joins `JoinRequestStatus`; the row is closed rather than deleted, so a second request creates a new row and the "one pending per traveler" rule still holds. Refused when the request is not pending, and refused for anyone but its own requester.
- [ ] Both routes obey the publish freeze the story already established, and are additive within /v1 (ADR-008).
- [ ] ITs at the HTTP seam: the listing shows only the viewer's own pending rows (seed two travelers, assert each sees exactly theirs) · a resolved request (approved, declined, withdrawn) leaves the listing · withdraw refuses a non-requester by the named code · withdraw refuses an already-resolved request · a withdrawn traveler may request again through the link · the teaser asserts roster/plan **absence** · the cover route refuses once resolved.

## Mobile

- [ ] **Reuse the frame-6 invitation card shell** — cover, title, "Destination · Dates", going-facepile — with only the action row differing. Do not fork the card; the two states share one component so the two inboxes cannot drift apart visually.
- [ ] The action row is a greyed **"Requested"** ghost pill — the add sheet's existing vocabulary (13/600 `#A59E99` on a `#E7E5E4` hairline border, **not tappable**, no press feedback) — beside a quiet **"Withdraw"** text action (13/600 muted, matching Decline's treatment).
- [ ] **No expiry line.** An invitation card shows "Expires in N days" from `expiresAt`; a join request has no expiry, so the slot renders nothing rather than inventing a value.
- [ ] Withdraw sits behind the app-drawn confirm: **"Withdraw your request?" / "You'll need the invite link again to ask a second time."** — the wording is load-bearing, not ceremonial: re-requesting needs the link, which the traveler may no longer have, so the act is less reversible than C2's "they may request again" implies.
- [ ] On withdraw the card exits via **M2** (fade 150ms, then the list closes the gap 200ms) — the same exit the invitation card uses when answered.
- [ ] Cards render **only while pending**; an approved or declined request is gone from the listing, so the card disappears on its own at the next fetch.
- [ ] Ordering when a traveler holds both: invitations first, then requests — the trip is asking you before you are asking it, and an invitation carries an expiry clock while a request does not.
- [ ] Strings the specs assert live in a plain `.ts` module both sides import (`travelerCopy.ts`) — Playwright cannot parse `.tsx`, and one bad import collapses the whole run.

## Coverage

- [ ] **Jest**: the card's state selection (pending → ghost + withdraw; nothing otherwise) and the ordering rule, as pure functions.
- [ ] **Playwright**: request through the link → the card is on Trips with the trip's context → withdraw behind its confirm → the card is gone and the owner's Requests section is empty → the same traveler can request again. Plus the negative that no automated rung would otherwise catch: **no email address renders on the card**, and the trip's plan content does not.
- [ ] The **device walk** rides ticket 10: the card's facepile pop, the M2 exit on withdraw, and the confirm on a real Android dialog.

## Comments

**2026-08-22 — why "Withdraw" and not "Cancel", and why it exists at all.** An invitation expires after 14 days, so its card self-cleans; a join request has **no expiry**, so a request the owner never answers would sit on the traveler's Trips page forever with no way to clear it — the same stranded shape the founder found on the `/join` landing, except this one never resolves. The word mirrors the consent direction C2 is built on: *Decline* refuses someone else's ask, *Withdraw* retracts your own. "Cancel" is avoided because it collides with the confirm dialog's own Cancel button.

**2026-08-22 — the tradeoff, taken knowingly.** Rendering only while pending means the card vanishes on decline, so the requester can infer they were refused — a partial erosion of C2's *"declines (silent)"*. Accepted: "silent" there means no notification and no confrontation, a card quietly vanishing is the gentlest available signal, and the alternative — a card lingering on a dead request — actively lies.
