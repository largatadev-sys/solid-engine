# S1.2 — Email invite → accept → member · spec

**Status:** intent locked 2026-07-20 — grilling session, owner-confirmed. Immutable point-in-time intent (issue-tracker rule): if intent changes during implementation, append to `## Comments`; never rewrite this body.
**Context anchor:** Epic 1, second story · S1.1 (the row-backed guard and the seeded-`member` contract this stands on — its AC 4 exists *for* this story) · Artifact 02 (Invitation entity, workspace state machine — both amended at this grilling) · Artifact 03 §76 (invite acceptance, rewritten at this grilling) · ADR-002 (cross-module composition by service interface) · ADR-008 (additive /v1) · epic-map backlog line "Email-verification enforcement — decided and built at S1.2" (S0.6 grilling) · UX rulings 2026-07-17 (email-only · decline supported · invitation survives onboarding · display name guaranteed at join). Supporting flow doc: `signup-onboarding-flow.md` in this directory; the 07/16 Figma export also lives here (its conflicts with canon are backlogged as the post-S1.2 reconciliation story).

## The pull (what this is and why now)

E1's collaboration is member-shaped, and S1.1 built the walls without a door: membership rows gate everything, and no mechanism creates one except test seeds. This story is the door — the co-traveler onboarding path (Artifact 02's journey: *receive email invite → authenticate → land in Workspace as member*). It is also the story three earlier decisions converge on by appointment: register #12 (resolved at this grilling: collapsed), the email-verification gate (S0.6: "built at S1.2"), and S1.1's member-role contract test. First founder-visible E1 story; first outbound integration this repo has.

## Goal

An owner invites a co-traveler by email from the Members screen. The email arrives in a real inbox. The invitee — existing traveler or brand-new sign-up — sees the invitation in-app, accepts, and the trip appears in their My Trips with the walls open (INV-1). Decline, revoke, and expiry all work. The S0.3/S1.1 guard ACs stay green, untouched.

## Locked decisions

### Register #12 — `forming` collapsed; no `state` column (grilling Q1)

Workspace is **`active` from creation**. Nothing anywhere branches on `forming` (INV-1 gates on membership, not state), and every backfilled pre-E1 workspace is solo-owner yet actively in use — the state would be wrong at birth. The `state` column defers to **S1.7**, the first story that reads a state value — S1.1's own "no column nothing reads" discipline, applied recursively. Recorded in Artifact 02.

### Invitations are owner-issued (grilling Q2)

`membership.role == OWNER` checked in the service against the guard's resolved `Membership` — **role authority, not an entitlement** (ADR-009's seam gates tier capabilities; who-may-do-X by role is domain authorization and stays in the service, this story and every E1 story after it). Widening to members later is additive.

### The Invitation machine (grilling Q3–Q4)

`pending → accepted | declined | revoked | expired` — all terminal; re-inviting after any terminal state is a **new row**; terminal rows are kept (the audit trail of who was asked in). **At most one `pending` per (workspace, email)** — partial unique index, and the predicate's enum spelling is a Hibernate contract that gets a pinning test (the S1.1 `WHERE role = 'owner'` near-miss, not repeated). **Expiry: 14 days, checked lazily** at read/transition time — an `expires_at` column, no scheduler. **No resend operation**: revoke + re-invite covers it with zero extra surface (ADR-008 makes every endpoint permanent; this one doesn't clear the bar).

### Accept authority: verified-email-match, no token (grilling Q5–Q6)

Acceptance requires the authenticated account's **verified** email to match the invited address — case-insensitive, read from the **token's** `email` + `email_verified` claims (the live assertion), never the Traveler row's provisioning-time snapshot. Without the verified check, email-match is theater: anyone can *claim* an address at Firebase sign-up. Google sign-ins arrive pre-verified; password accounts must click Firebase's verification link first (the mechanism already shipped: `sendEmailVerification()` at native sign-up).

**There is no bearer token.** The email is a pure notification; the **in-app invitation inbox** (pending invitations addressed to my verified email) is the accept surface. The token the original docs sketched authorized nothing the email-match doesn't, while costing a secret-management surface (hash-at-rest, burn-on-use, scanner-pre-click failures), deep-link + landing machinery, and the interim preview's promotion to load-bearing infrastructure. Alpha has no store install, so the link's one advantage — stranger glides in with zero setup — cannot occur; a magic-link join is an **additive post-validation option**. Consequence, structurally free: the "invitation survives sign-up/onboarding" ruling — it's a database row addressed to your email; finish sign-up whenever, it's waiting. Artifacts 02 and 03 updated.

**Accepted with open eyes:** the mismatch UX ("issued to a different address — sign in with it, or ask the organizer to re-invite this one"; showing the invited address is fine, the holder got the mail *from* it) · **no member removal until S1.5** — a wrong-person accept has no undo in alpha · the accepting traveler's id is recorded on the row (`accepted_by`).

### Display name at join (grilling Q7)

The backend already guarantees *a* name (S0.2: `name` claim, else email local part) — the ruling's real demand is attribution **quality**. One **prefilled display-name step for email/password sign-ups only**; Google sign-ups skip it (they arrive with a real name; onboarding stays minimal per the 07-17 ruling). Mechanism: Firebase `updateProfile({displayName})` + **token refresh, before the first backend call**, so provisioning's existing `name`-claim path picks it up — zero backend change, no premature `PATCH /v1/me`. The refresh-before-first-call ordering is the trap and gets a pinning test (stale claims silently provision the fallback). Trade accepted: existing travelers with junk derived names wait for a profile-edit story.

### Email: Resend behind a port, send-after-commit, no queue (grilling Q8)

Resend (04's "commodity choice, not an ADR" — free tier dwarfs alpha volume; plain HTTP via Spring `RestClient`, no SDK). An `InvitationMailer` **port** in the workspace module; adapter selected by API-key **presence** (the `DevCorsConfig` shape): local stack + ITs get a logging implementation (IDs only, P3), deployed `dev` sends real mail from `invites@largata.com`. **Send after the invitation commits; a send failure logs and degrades to revoke + re-invite — never a 500, never a retry queue** (infrastructure with no alpha payoff). Ops prerequisite, flagged: Resend account + SPF/DKIM DNS records on `largata.com` + `RESEND_API_KEY` in Railway's env UI (never the repo).

### API surface: seven additive endpoints, itinerary-addressed (grilling Q9)

**Workspace IDs stay off the wire.** The app knows itinerary IDs; the 1:1 is structural; the guard already resolves from them. `/trip-workspaces/…` in 05 was a style illustration, not a shipped contract.

| Endpoint | Who | Notes |
|---|---|---|
| `POST /v1/itineraries/{id}/invitations` `{email}` | owner | 201 · 403 `NOT_PERMITTED` (member, not owner) · 404-mask (non-member) · 409 `INVITATION_ALREADY_PENDING` / `ALREADY_A_MEMBER` |
| `GET /v1/itineraries/{id}/invitations` | member | pending list (INV-1: workspace-walled ⇒ member-visible; mutation owner-only) |
| `GET /v1/invitations` | any traveler | **the inbox** — pending, unexpired, addressed to my verified email |
| `POST /v1/invitations/{id}/accept` | invitee | 403 `EMAIL_NOT_VERIFIED` (client routes to verify-waiting on it) · 404-mask (someone else's) · 409 `ILLEGAL_TRANSITION` / expired |
| `POST /v1/invitations/{id}/decline` | invitee | same authority as accept |
| `POST /v1/invitations/{id}/revoke` | owner | POST transition, not DELETE — the row survives; accept/decline/revoke stay one grammatical family |
| `GET /v1/itineraries/{id}/members` | member | the member list S1.1 deferred here: `{travelerId, displayName, role, joinedAt}` |

Every list wears the cursor envelope `{items, nextCursor}` — 05: one shape, no exceptions. Inbox and member list are **cross-module compositions** (workspace rows + itinerary titles + identity names) built in the service layer via service interfaces by ID — ADR-002's first real exercise. **Accept = membership insert + status flip in one transaction**, in a service method that *opens* the transaction — exactly the non-itinerary caller S1.1's `MANDATORY` comment predicted.

### Mobile scope (grilling Q10)

Pull-based world (no notifications, founder ruling) ⇒ **the inbox lives pinned atop My Trips**, the screen every traveler lands on; empty inbox renders nothing. Inventory: inbox section (accept refreshes the trip list — the walls-open moment made visible; decline removes the card) · **Members screen** from trip view (list for all members; owner additionally: invite field, pending list, revoke) · **verify-email waiting state** on 403 `EMAIL_NOT_VERIFIED` (resend link + "I've verified" = token refresh + retry; *not* the Figma 6-digit code — backlogged reconciliation) · the display-name step (Q7) · typed `apiClient`/repository additions (ADR-001, no raw fetch in UI) · register-#2 analytics log events (`invite_sent/accepted/declined/revoked`). **Web parity:** same codebase, screens come free; one real gap closed — `firebaseWebRest.ts` gains `accounts:sendOobCode` (send-verification), else a password account created on the preview can never verify, and therefore never accept.

### One story, backend-first tickets, display-name cuttable (grilling Q11)

Splitting owner-side/invitee-side ships emails inviting people to accept something that doesn't exist; splitting backend/mobile buys a second spec for zero new decisions. One story; ticket order keeps `dev` coherent (nothing founder-visible until the UI tickets); the **display-name step is the last ticket and explicitly cuttable** to the backlogged sign-up/onboarding reconciliation story — the one piece with a safe fallback.

## Deliberate deferrals (recorded, not silent)

| Deferred | To | Why |
|---|---|---|
| Workspace `state` column + machine | S1.7 | Nothing reads state after `forming` collapsed; column ships with its first reader. |
| Member removal / leave | S1.5 | Epic-map slice; the wrong-person-accept gap until then is accepted for alpha. |
| Magic-link / token join | post-validation (additive) | No store install in alpha ⇒ the link's one advantage cannot occur; ADR-008 preserved. |
| Members-can-invite widening | if ever wanted | Additive authority relaxation. |
| Resend operation | if alpha shows fumbling | Revoke + re-invite covers it. |
| Profile editing (`PATCH /v1/me`, name fixes for existing travelers) | its own story | A permanent /v1 surface deserves the story that needs it. |
| Sign-up/onboarding screen polish (Figma reconciliation) | the story after S1.2 (epic-map backlog) | Mock predates the 07-17 rulings; S1.2 proceeds on the minimal reading. |
| Push/in-app notification of invites | post-launch (founder decision) | Invites travel by email; the inbox is pull-based like everything else in alpha. |

## ACs → proof map

| # | AC | Proven by |
|---|---|---|
| 1 | Owner invite: `POST` yields 201 + pending row + one dispatched mail; member-not-owner 403; non-member 404; duplicate-pending and already-member 409 | Service/contract ITs; mailer port recorded via logging impl |
| 2 | The one-pending rule is structural: second pending insert for (workspace, email) fails at the partial unique index, and the index's enum-spelling predicate is pinned | Storage IT (the S1.1 `MembershipStorageIT` pattern) |
| 3 | Accept, happy path: verified matching traveler → membership `member` + invitation `accepted` (+ `accepted_by`) in one transaction; trip listed for them; itinerary readable through the guard | IT through the service + guard; failure-injection IT proves the transaction (membership insert failure rolls back the status flip) |
| 4 | Accept, gates: unverified → 403 `EMAIL_NOT_VERIFIED`; mismatched verified email → 404-mask; non-pending/expired → 409 | Contract ITs (token-claim fixtures per flavor — the S0.2 four-token-flavors lesson) |
| 5 | Decline and revoke: correct terminal states, no membership; revoke is owner-only; inbox stops listing all three terminal outcomes + expired | ITs |
| 6 | Inbox: `GET /v1/invitations` returns pending unexpired invitations for my verified email with trip title + inviter name; cursor envelope | Contract IT |
| 7 | Member list: members see `{travelerId, displayName, role, joinedAt}`; non-members 404 | Contract IT |
| 8 | Guard regression: S0.3 + S1.1 guard ACs pass **unmodified** | Existing suites, zero edits |
| 9 | Display-name ordering: an email/password sign-up that sets a name pre-first-call provisions a Traveler carrying it — and a *skipped* refresh provisions the fallback (the test can fail) | Mobile Jest on the repository ordering + backend IT on the `name` claim path |
| 10 | The founder-visible loop on the layer that ships: on `dev` post-merge, a real invite from account A lands in a real founder-controlled inbox for B, B accepts in-app, the trip appears in B's My Trips and opens | Post-merge check on deployed `dev` (closes the gate) — a send-API 200 is not this proof; the discriminating signal is the mail in the inbox and the trip on B's screen |
| 11 | Web parity: the same loop drives on the preview container (`drive-preview.js` where applicable), including password-account verification via the new `sendOobCode` path | Preview-container run (S0.5 rule: container, never `expo export` + static server) |

**Deliberate omissions, on the record:** no migration-stepping IT — the migration is purely additive (new `invitation` table, no data backfill), so S1.1's machinery has nothing to test here. No concurrent-accept race AC beyond the unique constraints: `UNIQUE (workspace_id, traveler_id)` (S1.1) makes double-accept idempotent-or-conflict at the database, and testing it further is testing Postgres.

## Out of scope

Member removal / leave / ownership transfer · itinerary delete · comments · items CRUD · workspace `state` column · any token/magic-link mechanics · resend endpoint · `PATCH /v1/me` / profile editing · photo upload, bio, username, onboarding steps 3–4 (backlogged; reconciliation story follows) · push/in-app notifications · Apple sign-in · any non-additive /v1 change.

## Comments

**2026-07-22 — implemented; five decisions worth recording (issue-tracker rule: intent changes and discoveries land here, not in the body).**

1. **The Invitation lives in its own module `com.largata.invitation`, not `workspace` (ticket 01 said workspace).** Composing the inbox/member views needs itinerary titles and traveler names, so the invitation code depends on `itinerary` and `identity`; and `itinerary → workspace` already exists (S1.1 formation). Housing invitations in `workspace` would force `workspace → itinerary` and close the exact `itinerary ⇄ workspace` cycle ADR-002/ADR-011 forbid. As its own module it depends on the three below it (workspace, itinerary, identity, common) and nothing depends back — acyclic. This honours the deeper ADR-002 rule the ticket cited, and matches the Ledger's "bounded module inside the aggregate" precedent (Artifact 02). Members are admitted through `WorkspaceService` so membership rows are still written only by the module that owns them.

2. **A real bug this story surfaced and fixed: `ItineraryService.view` re-read by `(id, ownerId)`.** That S0.3 "belt-and-braces" assumed every authorized caller was the owner. S1.2 creates *members*, who pass the guard but are not owners — so the owner-scoped re-read 404'd (surfaced as a 500) the very traveler the guard had just admitted. Fixed to `findById`: the guard's `Membership` is the authority; re-checking ownership defeats membership. The now-dead `ItineraryRepository.findByIdAndOwnerId` was removed (as `existsByIdAndOwnerId` was at S1.1). AC 3's "itinerary readable through the guard" is what caught it.

3. **Accept atomicity + the persistence subtleties behind it.** Two JPA traps, both caught by ITs: (a) Spring Data `save()` *merges* an assigned-id/composite-key entity (its `isNew()` reads the always-set id as "existing"), so a duplicate membership would silently SELECT-then-UPDATE rather than fail — wrong semantics *and* it hid the atomicity failure. `admitMember` now `EntityManager.persist()` + `flush()` for true INSERT semantics. (b) Nested `@Transactional(readOnly=true)` calls can leave the session in a flush mode that skips a commit-time flush, so a bare mutation (revoke) was silently lost; the status transitions now `saveAndFlush`. Accept flips-and-flushes the invitation *before* admitting the member, so the atomicity IT genuinely distinguishes one transaction from two.

4. **Ticket 09 (display-name step) was cut** to the sign-up/onboarding reconciliation story (the next story after S1.2). The backend already guarantees a name at provisioning (the `name` claim, else the email local part), so the "name exists at join" ruling holds; the prefilled-name step's only insertion point is the auth-listener-driven sign-up flow that story restructures. Recorded on ticket 09 and the epic-map backlog line. The **web `sendOobCode` verification parity (ticket 08) was found already present** (`firebaseWebRest.ts` sent `VERIFY_EMAIL` on web sign-up since S0.6's REST pivot); ticket 08 reduced to the verify-waiting UI + the resend/refresh repository methods.

5. **AC 10/11 (deployed-dev + preview proofs) remain open — the gate is not closed.** Everything is proven on the local full stack (23 invitation ITs green, 268 mobile tests green, S0.3/S1.1 guard ACs unchanged). The deployed-`dev` real-inbox proof (AC 10) needs the Resend ops prerequisite (account + SPF/DKIM on `largata.com` + `LARGATA_RESEND_API_KEY` in Railway) and a post-merge run; the preview-container parity (AC 11) is a post-merge step. Both are owner-gated (the promotion is propose-first) and listed as the remaining gate work.
