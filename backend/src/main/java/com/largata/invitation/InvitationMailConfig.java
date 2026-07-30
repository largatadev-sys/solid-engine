package com.largata.invitation;

import com.largata.common.mail.ResendMailTransport;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;


@Configuration
class InvitationMailConfig {

    @Bean
    @ConditionalOnExpression(ResendMailTransport.API_KEY_PRESENT)
    InvitationMailer resendInvitationMailer(
            @org.springframework.beans.factory.annotation.Value("${largata.resend.api-key}") String apiKey,
            @org.springframework.beans.factory.annotation.Value("${largata.resend.from:invites@largata.com}")
                    String fromAddress) {
        return new ResendInvitationMailer(ResendMailTransport.statedTransport(), apiKey, fromAddress);
    }

    @Bean
    @ConditionalOnMissingBean(InvitationMailer.class)
    InvitationMailer loggingInvitationMailer() {
        return new LoggingInvitationMailer();
    }
}
