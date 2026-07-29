package com.largata.invitation;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.web.client.RestClient;


class ResendInvitationMailer implements InvitationMailer {

    private static final Logger log = LoggerFactory.getLogger(ResendInvitationMailer.class);
    private static final String SEND_URL = "https://api.resend.com/emails";

    private final RestClient http;
    private final String fromAddress;

    ResendInvitationMailer(RestClient.Builder builder, String apiKey, String fromAddress) {
        this.http = builder.baseUrl(SEND_URL).defaultHeader("Authorization", "Bearer " + apiKey).build();
        this.fromAddress = fromAddress;
    }

    @Override
    public void send(InvitationMail mail) {
        http.post()
                .contentType(MediaType.APPLICATION_JSON)
                .body(payload(mail))
                .retrieve()
                .toBodilessEntity();
        log.info("Invitation email dispatched via Resend: invitationId={}", mail.invitationId());
    }

    private ResendEmail payload(InvitationMail mail) {
        String subject = mail.inviterName() + " invited you to " + mail.tripTitle() + " on Largata";
        String html =
                "<p>"
                        + escape(mail.inviterName())
                        + " invited you to <strong>"
                        + escape(mail.tripTitle())
                        + "</strong> on Largata.</p><p>Open the Largata app to accept.</p>";
        return new ResendEmail(fromAddress, mail.recipientEmail(), subject, html);
    }


    private static String escape(String value) {
        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }


    private record ResendEmail(String from, String to, String subject, String html) {}
}
