# 07 — Ownership transfer rehomes; the members screen dies

**What to build:** frame 8 and the transfer menu entries — the whole offer/accept flow lives inside the Travelers tab (owner: ⋯ menu + row sub; offeree: the inline card at the tab's top), and the surfaces it replaces are deleted: the members screen, its route, and the trip-screen offer banner. Demoable end to end across two pool travelers.

**Blocked by:** 05 (the menus this extends).

**Status:** ready-for-agent

- [ ] The owner-on-member menu gains **Transfer ownership** (ink) above Remove; a member with a pending offer gets the variant **[Revoke ownership offer · Remove from trip]**. Confirms are platform alerts with the canvas copy: Offer — "They'll be asked to accept. Until then, you stay the owner." (accent confirm) · Revoke — "@handle won't be able to accept it. You stay the owner." (destructive confirm).
- [ ] The offered member's row sub shows **"Ownership offered · waiting on them"** (accent) while pending, dropping it on revoke/decline — riding the 200ms layout pass.
- [ ] The **offer card** (frame 8), offeree only, pinned above the list and scrolling with it: accent well, transfer icon, "@handle offered you ownership" single line, inline **Accept** (small accent pill) + **Decline** (quiet), both behind the existing confirm wording. Enters **first** in the M6 cascade; exits via M2 on either outcome; on accept the owner rows swap subs in the same layout pass.
- [ ] Existing offer/accept backend semantics untouched (one pending per workspace, INV-4 swap at accept); on a **published** trip no transfer affordance renders anywhere (01 enforces the server side).
- [ ] **Deletions**: the members screen and its route · the trip-screen ownership-offer banner. No navigation reference to either survives; the ownership-offer hooks' only consumers are the tab.
- [ ] The full flow walked across the pool (state the tags: e.g. t1 = offering owner, t2 = offeree): offer → row sub appears for t1, card appears for t2 → accept → roles swap on both viewers' tabs; and the revoke and decline branches.
- [ ] Jest: menu-variant extension · offer-card state (offeree-only visibility, pending/absent).
