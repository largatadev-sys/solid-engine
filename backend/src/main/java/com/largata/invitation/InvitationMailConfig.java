package com.largata.invitation;

import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

/**
 * Chooses the {@link InvitationMailer} by whether Resend is configured (S1.2) — the {@code
 * DevCorsConfig} presence/absence shape, and the same reasoning: the environment selects behaviour by
 * what it holds, with no test-aware branch inside the production code.
 *
 * <p><strong>Key present → Resend; key absent → logging.</strong> {@code largata.resend.api-key} is
 * set from the {@code LARGATA_RESEND_API_KEY} env var in Railway's UI on the deployed rung (Boot's
 * relaxed binding maps the env name to the property; never the repo — never-commit-secrets). It is
 * deliberately given no default and is absent from {@code application.yml}: an empty-string default
 * would count as "present" to {@link ConditionalOnProperty} and wrongly select Resend on the local
 * stack.
 * With no default, the local stack and every Testcontainers run have no such property and fall to the
 * logging adapter — which is why the ITs assert against the port, not a live inbox.
 *
 * <p>{@code @ConditionalOnMissingBean} on the logging bean is evaluated after the property-gated one
 * in the same class, so exactly one {@link InvitationMailer} exists in any environment.
 */
@Configuration
class InvitationMailConfig {

    @Bean
    @ConditionalOnProperty(prefix = "largata.resend", name = "api-key")
    InvitationMailer resendInvitationMailer(
            RestClient.Builder builder,
            @org.springframework.beans.factory.annotation.Value("${largata.resend.api-key}") String apiKey,
            @org.springframework.beans.factory.annotation.Value("${largata.resend.from:invites@largata.com}")
                    String fromAddress) {
        return new ResendInvitationMailer(builder, apiKey, fromAddress);
    }

    @Bean
    @ConditionalOnMissingBean(InvitationMailer.class)
    InvitationMailer loggingInvitationMailer() {
        return new LoggingInvitationMailer();
    }
}
