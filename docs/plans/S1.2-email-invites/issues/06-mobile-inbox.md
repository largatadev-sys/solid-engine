# 06 — Mobile: repository layer + the invitation inbox on My Trips

**Status:** done (2026-07-22)

**What to build:** the invitee-side client. Pull-based world ⇒ the inbox lives **pinned atop My Trips** (spec §Mobile) — no new tab, no menu item; empty inbox renders nothing.

1. **Repository layer first** (ADR-001 — no raw fetch in UI): typed `apiClient` methods + an `invitationsRepository` for inbox/accept/decline (owner-side methods ride ticket 07). Jest against the module contract, mocks enforcing the *server's* contract (error codes included) — the S0.2 mock lesson.
2. **Inbox section:** card per pending invite — "〈inviter〉 invited you to 〈trip〉" + Accept / Decline. Accept → refresh trip list (the new trip appearing *is* the walls-open moment made visible) → navigate into it. Decline → card gone. 403 `EMAIL_NOT_VERIFIED` → route to the verify-waiting state (ticket 08).
3. Errors surface via the envelope's `code`, never message-matching.
4. Web parity is free (same codebase) — verify on the preview container, not `expo export` (standing rule).

**Blocked by:** 05

- [ ] apiClient + invitationsRepository + Jest
- [ ] Inbox section on My Trips, accept/decline flows + error routing
- [ ] Analytics events fired from the repository/screen layer per register #2
