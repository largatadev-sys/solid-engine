package com.largata.report;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import tools.jackson.databind.ObjectMapper;


class ReportRelayBindingTest {

    private final ApplicationContextRunner contexts =
            new ApplicationContextRunner()
                    .withUserConfiguration(ReportRelayConfig.class, JsonConfig.class);


    @Test
    void aConfiguredIntakeUrlBindsTheWorklogRelay() {
        contexts
                .withPropertyValues("largata.reports.intake-url=https://worklog.example/api/intake/reports")
                .run(context -> assertThat(context.getBean(ReportRelay.class))
                        .isInstanceOf(WorklogReportRelay.class));
    }


    @Test
    void noIntakeUrlBindsTheLoggingSinkSoNoWalkEverReachesWorklog() {
        contexts.run(context -> assertThat(context.getBean(ReportRelay.class))
                .isInstanceOf(LoggingReportRelay.class));
    }


    @Test
    void aBlankIntakeUrlBindsTheLoggingSinkRatherThanRelayingNowhere() {
        contexts.withPropertyValues("largata.reports.intake-url=")
                .run(context -> assertThat(context.getBean(ReportRelay.class))
                        .isInstanceOf(LoggingReportRelay.class));
    }


    @Test
    void whitespaceIsNotAnIntakeUrlEither() {
        contexts.withPropertyValues("largata.reports.intake-url=   ")
                .run(context -> assertThat(context.getBean(ReportRelay.class))
                        .isInstanceOf(LoggingReportRelay.class));
    }


    @Test
    void exactlyOneRelayIsEverBound() {
        contexts
                .withPropertyValues("largata.reports.intake-url=https://worklog.example/api/intake/reports")
                .run(context -> assertThat(context.getBeansOfType(ReportRelay.class)).hasSize(1));

        contexts.run(context -> assertThat(context.getBeansOfType(ReportRelay.class)).hasSize(1));
    }


    @Configuration
    static class JsonConfig {

        @Bean
        ObjectMapper objectMapper() {
            return new ObjectMapper();
        }
    }
}
