package com.largata.report;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import tools.jackson.databind.ObjectMapper;


@Configuration
class ReportRelayConfig {

    @Bean
    @ConditionalOnExpression(WorklogReportRelay.INTAKE_CONFIGURED)
    ReportRelay worklogReportRelay(
            @Value("${largata.reports.intake-url}") String intakeUrl,
            @Value("${largata.reports.intake-secret:}") String intakeSecret,
            ObjectMapper json) {
        return new WorklogReportRelay(
                WorklogReportRelay.statedTransport(), intakeUrl, intakeSecret, json);
    }

    @Bean
    @ConditionalOnMissingBean(ReportRelay.class)
    ReportRelay loggingReportRelay() {
        return new LoggingReportRelay();
    }
}
