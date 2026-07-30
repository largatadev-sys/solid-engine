package com.largata.invitation;

import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;


@Configuration
class InvitationMailConfig {

    static final String API_KEY_PRESENT = "!'${largata.resend.api-key:}'.isBlank()";

    @Bean
    @ConditionalOnExpression(API_KEY_PRESENT)
    InvitationMailer resendInvitationMailer(
            @org.springframework.beans.factory.annotation.Value("${largata.resend.api-key}") String apiKey,
            @org.springframework.beans.factory.annotation.Value("${largata.resend.from:invites@largata.com}")
                    String fromAddress) {
        return new ResendInvitationMailer(RestClient.builder(), apiKey, fromAddress);
    }

    @Bean
    @ConditionalOnMissingBean(InvitationMailer.class)
    InvitationMailer loggingInvitationMailer() {
        return new LoggingInvitationMailer();
    }
}
