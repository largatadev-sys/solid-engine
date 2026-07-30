package com.largata.verification;

import com.largata.common.mail.ResendMailTransport;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;


@Configuration
class VerificationMailConfig {

    @Bean
    @ConditionalOnExpression(ResendMailTransport.API_KEY_PRESENT)
    VerificationMailer resendVerificationMailer(
            @Value("${largata.resend.api-key}") String apiKey,
            @Value("${largata.resend.from:invites@largata.com}") String fromAddress) {
        return new ResendVerificationMailer(ResendMailTransport.statedTransport(), apiKey, fromAddress);
    }

    @Bean
    @ConditionalOnMissingBean(VerificationMailer.class)
    VerificationMailer loggingVerificationMailer(Environment environment) {
        return new LoggingVerificationMailer(environment.matchesProfiles(DEV_PROFILE));
    }


    static final String DEV_PROFILE = "dev";
}
