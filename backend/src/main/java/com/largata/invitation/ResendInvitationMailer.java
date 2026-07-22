package com.largata.invitation;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.web.client.RestClient;

/**
 * Sends invitation emails through Resend (S1.2) — the deployed-rung adapter, active only when a
 * Resend API key is configured (see {@link InvitationMailConfig}).
 *
 * <p><strong>Plain HTTP, no SDK.</strong> One {@code POST https://api.resend.com/emails} via Spring's
 * {@link RestClient} — no {@code com.resend} dependency to carry, update, or be surprised by. Resend
 * is a commodity choice, not an ADR (Artifact 04); this adapter is the whole coupling to it, so
 * swapping providers is one class.
 *
 * <p><strong>Logs the invitation id, nothing else</strong> (P3): not the recipient, not the title.
 * The address is in the request body because that is the function; it is never in a log line.
 */
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

    /** Minimal HTML-escaping — the title and name are user-controlled and land in an HTML body. */
    private static String escape(String value) {
        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }

    /** Resend's send payload. {@code to} is a single address; Resend also accepts an array, unneeded here. */
    private record ResendEmail(String from, String to, String subject, String html) {}
}
