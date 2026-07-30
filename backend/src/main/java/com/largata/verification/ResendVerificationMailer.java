package com.largata.verification;

import com.largata.common.mail.OutboundEmail;
import com.largata.common.mail.ResendMailTransport;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.client.RestClient;


class ResendVerificationMailer implements VerificationMailer {

    private static final Logger log = LoggerFactory.getLogger(ResendVerificationMailer.class);

    private final ResendMailTransport transport;

    ResendVerificationMailer(RestClient.Builder builder, String apiKey, String fromAddress) {
        this.transport = new ResendMailTransport(builder, apiKey, fromAddress);
    }

    @Override
    public void send(VerificationMail mail) {
        transport.send(compose(mail));
        log.info("Verification code email dispatched via Resend: travelerId={}", mail.travelerId());
    }

    private OutboundEmail compose(VerificationMail mail) {
        String html =
                "<p>Your Largata verification code is:</p>"
                        + "<p style=\"font-size:32px;letter-spacing:8px;font-weight:700\">"
                        + ResendMailTransport.escape(mail.code())
                        + "</p>"
                        + "<p>It expires in "
                        + VerificationService.CODE_TTL.toMinutes()
                        + " minutes. If you did not ask for it, you can ignore this email.</p>";
        return new OutboundEmail(mail.recipientEmail(), "Your Largata verification code", html);
    }
}
