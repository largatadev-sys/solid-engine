package com.largata.verification;

import static org.assertj.core.api.Assertions.assertThat;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;

class LoggingVerificationMailerTest {

    private ListAppender<ILoggingEvent> logCapture;

    @BeforeEach
    void setUp() {
        logCapture = new ListAppender<>();
        logCapture.start();
        sinkLogger().addAppender(logCapture);
    }

    @AfterEach
    void tearDown() {
        sinkLogger().detachAppender(logCapture);
    }

    @Test
    void theKeylessSinkPrintsTheCodeSoALocalRungCanReadItWithoutAnInbox() {
        UUID travelerId = UUID.randomUUID();

        new LoggingVerificationMailer(true).send(new VerificationMail(travelerId, "t1@example.com", "004242"));

        assertThat(logCapture.list)
                .singleElement()
                .satisfies(event -> assertThat(event.getFormattedMessage())
                        .contains("004242")
                        .contains(travelerId.toString()));
    }

    @Test
    void offTheDevProfileTheCodeIsWithheldEvenThoughTheSinkStillStandsIn() {
        UUID travelerId = UUID.randomUUID();

        new LoggingVerificationMailer(false).send(new VerificationMail(travelerId, "t1@example.com", "004242"));

        assertThat(logCapture.list)
                .as("a deployed rung that lost its Resend key must not start printing live credentials")
                .singleElement()
                .satisfies(event -> assertThat(event.getFormattedMessage())
                        .doesNotContain("004242")
                        .contains(travelerId.toString()));
    }

    @Test
    void theSinkNamesNoAddressInEitherMode() {
        new LoggingVerificationMailer(true)
                .send(new VerificationMail(UUID.randomUUID(), "private@example.com", "004242"));
        new LoggingVerificationMailer(false)
                .send(new VerificationMail(UUID.randomUUID(), "private@example.com", "004242"));

        assertThat(logCapture.list)
                .hasSize(2)
                .allSatisfy(event ->
                        assertThat(event.getFormattedMessage()).doesNotContain("private@example.com"));
    }

    private static Logger sinkLogger() {
        return (Logger) LoggerFactory.getLogger(LoggingVerificationMailer.class);
    }
}
