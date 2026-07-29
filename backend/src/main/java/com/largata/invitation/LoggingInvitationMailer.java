package com.largata.invitation;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;


class LoggingInvitationMailer implements InvitationMailer {

    private static final Logger log = LoggerFactory.getLogger(LoggingInvitationMailer.class);

    @Override
    public void send(InvitationMail mail) {
        log.info("Invitation email dispatched (logging sink, no wire): invitationId={}", mail.invitationId());
    }
}
