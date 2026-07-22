package com.largata.invitation;

/**
 * The port for sending an invitation email (S1.2) — the repo's first outbound integration, behind an
 * interface so the provider stays a commodity choice (spec §Email; P9: ports-and-adapters at an
 * external boundary, the one place the pattern earns its keep).
 *
 * <p>Two adapters implement it, selected by whether a Resend API key is configured (the {@code
 * DevCorsConfig} presence/absence shape): {@link LoggingInvitationMailer} on the local stack and in
 * tests, {@link ResendInvitationMailer} on the deployed rung. Callers never see either — the workspace
 * side of the module holds this type, not {@code com.resend} anything.
 *
 * <p><strong>May throw.</strong> A send can fail (network, provider outage). The contract does not
 * ask implementations to swallow that — {@code InvitationService} dispatches <em>after</em> the
 * invitation has committed and isolates the failure there (send-after-commit, log-don't-retry: a
 * failed send is recoverable by revoke + re-invite, so it degrades rather than failing the request).
 */
public interface InvitationMailer {

    void send(InvitationMail mail);
}
