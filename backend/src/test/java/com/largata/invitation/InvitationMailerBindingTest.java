package com.largata.invitation;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.web.client.RestClient;

class InvitationMailerBindingTest {

    private final ApplicationContextRunner contexts = new ApplicationContextRunner()
            .withBean(RestClient.Builder.class, RestClient::builder)
            .withUserConfiguration(InvitationMailConfig.class);

    @Test
    void aConfiguredApiKeyBindsTheResendMailer() {
        contexts.withPropertyValues("largata.resend.api-key=re_a_real_looking_key")
                .run(context -> assertThat(context.getBean(InvitationMailer.class))
                        .isInstanceOf(ResendInvitationMailer.class));
    }

    @Test
    void noApiKeyFallsBackToTheLoggingSink() {
        contexts.run(context -> assertThat(context.getBean(InvitationMailer.class))
                .isInstanceOf(LoggingInvitationMailer.class));
    }

    @Test
    void aBlankApiKeyFallsBackToTheLoggingSinkRatherThanSendingWithNoCredential() {
        contexts.withPropertyValues("largata.resend.api-key=")
                .run(context -> assertThat(context.getBean(InvitationMailer.class))
                        .isInstanceOf(LoggingInvitationMailer.class));
    }

    @Test
    void whitespaceIsNotACredentialEither() {
        contexts.withPropertyValues("largata.resend.api-key=   ")
                .run(context -> assertThat(context.getBean(InvitationMailer.class))
                        .isInstanceOf(LoggingInvitationMailer.class));
    }
}
