# S1.2 — Sign-up, onboarding & invite-join flow · supporting flow doc

**Status: grilling complete (2026-07-20); all decisions owner-locked and carried into [spec.md](spec.md) — the spec is authoritative where they differ.** **Q6: Architecture 2 — the invitation inbox** (the email is a pure notification; no token in the accept path; the in-app inbox — pending invites for my verified email — is the accept surface). **Q7: display-name step for email/password sign-ups only** (prefilled with the derived name; Google sign-ups skip it; set via Firebase `updateProfile` + token refresh *before* the first backend call, so provisioning's existing `name`-claim path picks it up — zero backend change; the token-refresh ordering gets a pinning test). This file becomes part of the S1.2 story folder when the spec lands.

**Locked so far:** `forming` collapsed — workspace `active` from creation (reg. #12 closed) · invites owner-only · statuses `pending → accepted | declined | revoked | expired`, all terminal, one `pending` per workspace+email · 14-day lazy expiry, no resend (revoke + re-invite) · accept requires **verified**-email-match (case-insensitive).

---

## The three journeys

### A. Owner sends an invite

```
My Trips → trip → Members
  → "Invite by email" (owner-only; members don't see the action)
  → enter address → send
      ├─ already a pending invite for that address → surfaced, not duplicated (one-pending rule)
      ├─ address belongs to an existing member     → surfaced, nothing sent
      └─ ok → Invitation row (pending, expires +14d) + email dispatched
  → pending list shows: address · sent date · [Revoke]
```

Revoke is the only management verb. "She didn't get it" = revoke → invite again (new row, new email).

### B. Invitee who already has the app + account

```
email notification arrives ("<owner> invited you to <trip> on Largata")
  → opens app (already signed in, email already verified)
  → invitation inbox (Q6 ✓): pending invites for my verified email listed
    in-app → [Accept] / [Decline]
  → Accept → membership row (member) + invitation → accepted, one transaction
             → workspace walls open (INV-1) → trip appears in My Trips
  → Decline → invitation → declined; nothing else changes
```

### C. Invitee who is new — the full sign-up + onboarding path

```
email notification arrives
  → has no app: alpha = sideload; the APK reaches them from the founders/owner
    (no store; the email says "ask your organizer for the app" or links the preview)
  → sign-up:
      ├─ Google button → Firebase account, email arrives VERIFIED
      └─ email/password → Firebase account, email UNVERIFIED
            → must click Firebase's verification mail before any accept
              (Q5b: unverified match is no match)
  → Traveler provisioned on first authenticated call (S0.2 mechanics, unchanged)
      → display name auto-derived: `name` claim, else email local part
  → onboarding, minimal (founder ruling):
      → display-name step (Q7 ✓): email/password sign-ups only, prefilled
        with the derived name; Google sign-ups skip it (they arrive with a
        real name). Mechanism: Firebase updateProfile + token refresh before
        the first backend call — no new /v1 endpoint.
  → lands where journey B begins (inbox / accept screen)
  → the invitation was NEVER at risk during any of this:
      it is a database row addressed to the invited email — sign-up taking
      minutes or days changes nothing ("survives onboarding" ruling,
      structurally free under Arch 2; under Arch 1 it is client-side token
      persistence across the whole auth flow)
```

---

## The mismatch path (Q5's cost, accepted with open eyes)

```
signed-in traveler's verified email ≠ invited address
  → invitation not visible / accept refused
  → screen: "This invitation was issued to <invited address>. Sign in with
     that address, or ask the organizer to invite this one."
  → recovery: owner revokes + re-invites the right address (journey A)
```

Known gap until S1.5 (member removal): a *right-address, wrong-person* accept has no undo. Accepted for alpha (founders-and-friends).

---

## Flowchart (journey C, the longest path)

```mermaid
flowchart TD
    E[Invite email arrives] --> HasApp{Has app +\naccount?}
    HasApp -- yes --> Inbox
    HasApp -- no --> Side[Sideload APK\n(alpha: from founders)]
    Side --> SignUp{Sign-up method}
    SignUp -- Google --> Prov[Traveler provisioned\nemail verified ✓]
    SignUp -- email/password --> Verify[Firebase verification mail\nmust be clicked]
    Verify --> Prov
    Prov --> Name{OPEN Q7:\nchosen-name screen\nor derived fallback?}
    Name --> Inbox[OPEN Q6: invitation inbox\n(pending invites for my\nverified email)]
    Inbox -- Accept --> Member[Membership row: member\nInvitation: accepted\n— one transaction]
    Inbox -- Decline --> Decl[Invitation: declined]
    Member --> Trip[Trip in My Trips\nwalls open — INV-1]
```

---

## What each open decision does to this flow

| | Q6 = Arch 2 (inbox) | Q6 = Arch 1 (token link) |
|---|---|---|
| Email content | pure notification | carries the bearer-ish link |
| Deep links / web landing | none needed | required (largata:// + a landing page — promotes the interim preview into product surface) |
| "Survives sign-up" ruling | free (it's a DB row) | client-side token persistence across auth |
| Accept authority | verified-email-match only | token AND email-match — two authorities that can disagree |
| New endpoints | list-my-invites + accept/decline | accept-by-token + the same list anyway for in-app visibility |
