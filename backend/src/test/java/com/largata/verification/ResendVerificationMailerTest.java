package com.largata.verification;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import java.util.UUID;
import org.hamcrest.Matchers;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpMethod;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

class ResendVerificationMailerTest {

    private static final UUID TRAVELER_ID = UUID.randomUUID();
    private static final String CODE = "004242";

    private RestClient.Builder builder;
    private MockRestServiceServer resend;
    private ListAppender<ILoggingEvent> logCapture;

    @BeforeEach
    void setUp() {
        builder = RestClient.builder();
        resend = MockRestServiceServer.bindTo(builder).build();
        logCapture = new ListAppender<>();
        logCapture.start();
        mailerLogger().addAppender(logCapture);
    }

    @AfterEach
    void tearDown() {
        mailerLogger().detachAppender(logCapture);
    }

    @Test
    void theCodeTravelsInTheMailBody() {
        resend.expect(method(HttpMethod.POST))
                .andExpect(content().string(Matchers.containsString(CODE)))
                .andRespond(withSuccess());

        send();

        resend.verify();
    }

    @Test
    void theRealMailerNeverPutsTheCodeInTheLog() {
        resend.expect(method(HttpMethod.POST)).andRespond(withSuccess());

        send();

        assertThat(logCapture.list)
                .isNotEmpty()
                .allSatisfy(event -> assertThat(event.getFormattedMessage())
                        .doesNotContain(CODE)
                        .doesNotContain("verified@example.com"));
    }

    private void send() {
        new ResendVerificationMailer(builder, "re_test_key", "verify@largata.com")
                .send(new VerificationMail(TRAVELER_ID, "verified@example.com", CODE));
    }

    private static Logger mailerLogger() {
        return (Logger) LoggerFactory.getLogger(ResendVerificationMailer.class);
    }
}
