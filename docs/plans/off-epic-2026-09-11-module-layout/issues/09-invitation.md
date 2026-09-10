# 09: invitation takes layers, and `InvitationApi` stays

**What to build:** the invitations module reads in the converted shape and inviting, accepting, declining and the inbox behave exactly as they do today. It is the one module in this series with a real in-process contract — `join` calls `InvitationApi` to supersede a pending invitation — so `api/` stays exactly as it is, implemented directly by the service as today. `ArchiveVoidsInvitations` reacts to `trip`'s archive event and `InboxTopic` declares the inbox topic over the transport; both are adapters. The mailer port with its logging and Resend adapters is the two-sided internal seam the spec describes.

**The move.** `api/`: unchanged. `controller/`: `InvitationController`, `TripInvitationController`. `dto/`: `CreateInvitationRequest`, `InviteByHandleRequest`, `InvitationResponse`, `InboxInvitationResponse`, `AcceptResponse`. `entity/`: `Invitation`, `InvitationStatus`. `repository/`: `InvitationRepository`. `exception/`: `InvitationExceptions`. `service/`: `InvitationService`, `InvitationMailer`, `InvitationMail`, `InboxInvitation`, `PendingInvitation`. `adapter/`: `ArchiveVoidsInvitations`, `InboxTopic`, `LoggingInvitationMailer`, `ResendInvitationMailer`, `InvitationMailConfig`.

**Blocked by:** None (can start immediately).

**Status:** claimed

- [ ] Every main-tree class of the module sits in a target folder and the module root holds none; `api/` is byte-identical
- [ ] `join` compiles against `InvitationApi` unchanged
- [ ] `ArchiveVoidsInvitations` keeps `BEFORE_COMMIT` and `MANDATORY` propagation, and its atomicity test follows it and passes unedited — this is ADR-038 rule 5's recorded exception, and a move must not loosen it
- [ ] The mail profile pair still resolves exactly one mailer in each profile, proven by one IT run in each
- [ ] The boundary test passes with its allowlist unchanged and both predicates still selecting something
- [ ] No test changes but its package line and imports; the invitation ITs pass unedited
- [ ] The spec's verification loop, in full, and the structural guards green
- [ ] The last commit sets this ticket `resolved` and flips its ledger glyph; the PR is opened, never merged unasked

## Comments
