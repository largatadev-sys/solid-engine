package com.largata.verification;

import static org.assertj.core.api.Assertions.assertThat;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

class VerificationMailerBindingTest {

    private final ApplicationContextRunner contexts =
            new ApplicationContextRunner().withUserConfiguration(VerificationMailConfig.class);

    @Test
    void aConfiguredApiKeyBindsTheResendMailer() {
        contexts.withPropertyValues("largata.resend.api-key=re_a_real_looking_key")
                .run(context -> assertThat(context.getBean(VerificationMailer.class))
                        .isInstanceOf(ResendVerificationMailer.class));
    }

    @Test
    void noApiKeyFallsBackToTheLoggingSink() {
        contexts.run(context -> assertThat(context.getBean(VerificationMailer.class))
                .isInstanceOf(LoggingVerificationMailer.class));
    }

    @Test
    void aBlankApiKeyFallsBackToTheLoggingSinkRatherThanSendingWithNoCredential() {
        contexts.withPropertyValues("largata.resend.api-key=")
                .run(context -> assertThat(context.getBean(VerificationMailer.class))
                        .isInstanceOf(LoggingVerificationMailer.class));
    }

    @Test
    void whitespaceIsNotACredentialEither() {
        contexts.withPropertyValues("largata.resend.api-key=   ")
                .run(context -> assertThat(context.getBean(VerificationMailer.class))
                        .isInstanceOf(LoggingVerificationMailer.class));
    }

    @Test
    void onlyTheDevProfileGetsTheCodePrintedIntoTheLog() {
        contexts.withPropertyValues("spring.profiles.active=dev")
                .run(context -> assertThat(printsCode(context.getBean(VerificationMailer.class))).isTrue());

        contexts.run(context -> assertThat(printsCode(context.getBean(VerificationMailer.class)))
                .as("prod and preprod run no profile, so a lost Resend key must not turn the log "
                        + "into a credential feed")
                .isFalse());
    }

    private static boolean printsCode(VerificationMailer mailer) {
        ListAppender<ILoggingEvent> capture = new ListAppender<>();
        capture.start();
        Logger sink = (Logger) LoggerFactory.getLogger(LoggingVerificationMailer.class);
        sink.addAppender(capture);
        try {
            mailer.send(new VerificationMail(UUID.randomUUID(), "t1@example.com", "004242"));
            return capture.list.stream().anyMatch(event -> event.getFormattedMessage().contains("004242"));
        } finally {
            sink.detachAppender(capture);
        }
    }
}
