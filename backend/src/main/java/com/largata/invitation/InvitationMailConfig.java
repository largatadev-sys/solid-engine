package com.largata.invitation;

import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;


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
