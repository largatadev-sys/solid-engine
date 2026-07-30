package com.largata.invitation;

import com.largata.common.mail.OutboundEmail;
import com.largata.common.mail.ResendMailTransport;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.client.RestClient;


class ResendInvitationMailer implements InvitationMailer {

    private static final Logger log = LoggerFactory.getLogger(ResendInvitationMailer.class);

    private final ResendMailTransport transport;

    ResendInvitationMailer(RestClient.Builder builder, String apiKey, String fromAddress) {
        this.transport = new ResendMailTransport(builder, apiKey, fromAddress);
    }

    @Override
    public void send(InvitationMail mail) {
        transport.send(compose(mail));
        log.info("Invitation email dispatched via Resend: invitationId={}", mail.invitationId());
    }

    private OutboundEmail compose(InvitationMail mail) {
        String subject = mail.inviterName() + " invited you to " + mail.tripTitle() + " on Largata";
        String html =
                "<p>"
                        + ResendMailTransport.escape(mail.inviterName())
                        + " invited you to <strong>"
                        + ResendMailTransport.escape(mail.tripTitle())
                        + "</strong> on Largata.</p><p>Open the Largata app to accept.</p>";
        return new OutboundEmail(mail.recipientEmail(), subject, html);
    }
}
