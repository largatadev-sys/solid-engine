# 10: invitation takes layers, and `InvitationApi` stays

**What to build:** `invitation` moves onto the layer folders. It is the one module in this effort with a real in-process contract — `join` calls `InvitationApi.supersedePendingInvitationsFor` — so `api/` stays exactly as it is. `ArchiveVoidsInvitations` reacts to `trip`'s `TripArchived` event and `InboxTopic` declares the inbox topic over the transport; both are adapters. The mailer port with its logging and Resend adapters is the two-sided internal seam the spec describes.

| Folder | Files |
|---|---|
| `api/` | `InvitationApi`, `package-info.java` — unchanged |
| `controller/` | `InvitationController`, `TripInvitationController` |
| `dto/` | `CreateInvitationRequest`, `InviteByHandleRequest`, `InvitationResponse`, `InboxInvitationResponse`, `AcceptResponse` |
| `entity/` | `Invitation`, `InvitationStatus` |
| `repository/` | `InvitationRepository` |
| `exception/` | `InvitationExceptions` |
| `service/` | `InvitationService`, `InvitationMailer`, `InvitationMail`, `InboxInvitation`, `PendingInvitation` |
| `adapter/` | `ArchiveVoidsInvitations`, `InboxTopic`, `LoggingInvitationMailer`, `ResendInvitationMailer`, `InvitationMailConfig` |

**Blocked by:** None.

**Status:** ready-for-agent

- [ ] The spec's done-checklist, in full
- [ ] `InvitationApi` is implemented the way it is today (directly by the service, per ADR-038 rule 3's tell, since the method returns nothing) and `join` compiles against it unchanged
- [ ] `ArchiveVoidsInvitations` keeps `BEFORE_COMMIT` and `MANDATORY` propagation; `ArchiveVoidsInvitationsAtomicallyTest` follows it and passes unedited — this is ADR-038 rule 5's recorded exception and a move must not loosen it
- [ ] The mail profile pair still resolves exactly one mailer in each profile; one IT run in each

## Comments
