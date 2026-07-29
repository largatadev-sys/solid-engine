package com.largata.common.analytics;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;


class LoggingAnalyticsTest {

    private final LoggingAnalytics analytics = new LoggingAnalytics();
    private ListAppender<ILoggingEvent> logCapture;

    @BeforeEach
    void setUp() {
        logCapture = new ListAppender<>();
        logCapture.start();
        analyticsLogger().addAppender(logCapture);
    }

    @AfterEach
    void tearDown() {
        analyticsLogger().detachAndStopAllAppenders();
        MDC.clear();
    }

    @Test
    void anEventBecomesOneLineWithItsAttributesAsFields() {
        analytics.emit(AnalyticsEvent.named("itinerary_created").with("destinationCount", 2).build());

        assertThat(logCapture.list)
                .singleElement()
                .satisfies(
                        line -> {
                            assertThat(line.getFormattedMessage()).isEqualTo("event=itinerary_created");
                            assertThat(line.getMDCPropertyMap()).containsEntry("event.destinationCount", "2");
                        });
    }

    @Test
    void attributesDoNotOutliveTheEventTheyBelongTo() {
        analytics.emit(AnalyticsEvent.named("itinerary_created").with("itineraryId", "abc").build());

        assertThat(MDC.getCopyOfContextMap()).isNullOrEmpty();
    }

    @Test
    void aSecondEventCannotSeeTheFirstEventsAttributes() {
        analytics.emit(AnalyticsEvent.named("first").with("itineraryId", "abc").build());
        analytics.emit(AnalyticsEvent.named("second").with("travelerId", "xyz").build());

        assertThat(logCapture.list.get(1).getMDCPropertyMap())
                .containsEntry("event.travelerId", "xyz")
                .doesNotContainKey("event.itineraryId");
    }

    @Test
    void aBrokenAppenderNeverReachesTheCaller() {
        analyticsLogger().addAppender(explodingAppender());

        assertThatCode(() -> analytics.emit(AnalyticsEvent.named("itinerary_created").with("a", 1).build()))
                .doesNotThrowAnyException();
    }

    @Test
    void attributeConversionFailuresNeverReachTheCaller() {
        Object hostile =
                new Object() {
                    @Override
                    public String toString() {
                        throw new IllegalStateException("attribute is hostile");
                    }
                };

        assertThatCode(
                        () ->
                                analytics.emit(
                                        AnalyticsEvent.named("itinerary_created").with("bad", hostile).build()))
                .doesNotThrowAnyException();
    }

    @Test
    void aFailedEventStillCleansUpAfterItself() {
        Object hostile =
                new Object() {
                    @Override
                    public String toString() {
                        throw new IllegalStateException("attribute is hostile");
                    }
                };

        analytics.emit(AnalyticsEvent.named("itinerary_created").with("ok", "kept").with("bad", hostile).build());

        assertThat(MDC.getCopyOfContextMap()).isNullOrEmpty();
    }

    @Test
    void anEventWithNoAttributesStillLogs() {
        analytics.emit(AnalyticsEvent.named("traveler_signed_up").build());

        assertThat(logCapture.list).singleElement().satisfies(line ->
                assertThat(line.getFormattedMessage()).isEqualTo("event=traveler_signed_up"));
    }


    private static ch.qos.logback.core.Appender<ILoggingEvent> explodingAppender() {
        ch.qos.logback.core.AppenderBase<ILoggingEvent> appender =
                new ch.qos.logback.core.AppenderBase<>() {
                    @Override
                    protected void append(ILoggingEvent event) {
                        throw new IllegalStateException("sink is down");
                    }
                };
        appender.setContext(analyticsLogger().getLoggerContext());
        appender.start();
        return appender;
    }

    private static Logger analyticsLogger() {
        return (Logger) LoggerFactory.getLogger("com.largata.analytics");
    }
}
