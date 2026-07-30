package com.largata.verification;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;


class LoggingVerificationMailer implements VerificationMailer {

    private static final Logger log = LoggerFactory.getLogger(LoggingVerificationMailer.class);

    private final boolean printsCode;

    LoggingVerificationMailer(boolean printsCode) {
        this.printsCode = printsCode;
    }

    @Override
    public void send(VerificationMail mail) {
        if (printsCode) {
            log.info(
                    "Verification code email dispatched (logging sink, no wire): travelerId={} code={}",
                    mail.travelerId(),
                    mail.code());
            return;
        }
        log.warn(
                "Verification code email NOT SENT: no Resend key on this rung, and the code is withheld "
                        + "from the log outside the dev profile: travelerId={}",
                mail.travelerId());
    }
}
