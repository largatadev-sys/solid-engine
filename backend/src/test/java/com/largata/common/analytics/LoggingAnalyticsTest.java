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

/** Ticket 04's ACs at the unit seam: the sink's own contract, no Spring and no database. */
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
        // detachAndStopAllAppenders, not detachAppender(logCapture): the failure tests attach an
        // exploding appender, and a logger is a process-wide singleton — one left attached would
        // break unrelated tests in a way that looks nothing like its cause.
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
                            // The attribute is a field on the line, not part of the message — which
                            // is what makes it queryable without parsing.
                            assertThat(line.getMDCPropertyMap()).containsEntry("event.destinationCount", "2");
                        });
    }

    @Test
    void attributesDoNotOutliveTheEventTheyBelongTo() {
        // The MDC is thread-local and threads are pooled: a key left behind reappears on an
        // unrelated request's lines further down the pool, attributing one traveler's event data to
        // another's request. The bug is invisible in any test that emits only once.
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
        // Honest framing, learned by breaking it: this passes with LoggingAnalytics' own catch
        // REMOVED, because AppenderBase.doAppend() swallows append() failures and reports them to
        // Logback's status manager — a logging framework's standing promise not to break its host.
        // The test is kept because it pins that promise (a future appender/encoder change that
        // starts propagating would be caught here), not because it exercises our catch.
        // Our catch is proven by attributeConversionFailuresNeverReachTheCaller below.
        analyticsLogger().addAppender(explodingAppender());

        assertThatCode(() -> analytics.emit(AnalyticsEvent.named("itinerary_created").with("a", 1).build()))
                .doesNotThrowAnyException();
    }

    @Test
    void attributeConversionFailuresNeverReachTheCaller() {
        // The failure mode the catch actually covers: everything this class does *around* the log
        // call. An attribute whose toString() throws is the reachable example today — a durable
        // sink (the pre-alpha upgrade) adds many more, and the Analytics contract already promises
        // callers they need no try/catch. Verified by deleting the catch and watching this fail.
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
        // The catch must not skip the MDC cleanup — otherwise the one time an event misbehaves is
        // also the time its keys leak into every later request on this pooled thread.
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

    /** A sink that fails the way a real one might: it throws when the line is written. */
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
