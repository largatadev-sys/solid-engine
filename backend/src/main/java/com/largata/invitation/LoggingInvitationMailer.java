package com.largata.invitation;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * The mailer with no wire behind it — the local stack and every integration test (S1.2).
 *
 * <p>Selected whenever no Resend API key is configured (see {@link InvitationMailConfig}), so a
 * developer needs no account to run the app and the ITs assert against the port rather than against
 * Google's SMTP. It records that an invite <em>would</em> have been sent, naming the invitation by id
 * only — never the recipient address, the trip title, or the inviter's name (P3: those are PII / user
 * content, and a log line outlives the request).
 */
class LoggingInvitationMailer implements InvitationMailer {

    private static final Logger log = LoggerFactory.getLogger(LoggingInvitationMailer.class);

    @Override
    public void send(InvitationMail mail) {
        log.info("Invitation email dispatched (logging sink, no wire): invitationId={}", mail.invitationId());
    }
}
