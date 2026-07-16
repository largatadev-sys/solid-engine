package com.largata.common.analytics;

import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.stereotype.Component;

/**
 * The v1 analytics sink: one structured line per event, on its own logger (S0.3 grilling).
 *
 * <p><strong>Its own logger name, not the emitting class's.</strong> {@code com.largata.analytics}
 * is what makes these lines mechanically separable from application logs — greppable now, routable
 * later (a log-shipper rule can lift exactly this logger into whatever the durable sink turns out to
 * be), and independently levelable if events ever get noisy. A line logged under {@code
 * ItineraryService} would be indistinguishable from that class's operational logging.
 *
 * <p><strong>Attributes ride the MDC.</strong> The app logs structured ECS JSON with no extra
 * dependency (application.yml — a deliberate S0.1 choice), and Boot's ECS formatter renders MDC
 * entries as real JSON fields. So attributes are put on the MDC around the one log call and removed
 * after: queryable fields, no logstash-encoder dependency added for a single line, and the same
 * mechanism {@code LogContextFilter} already uses for traceId/userId. (Interpolating JSON into the
 * message was the alternative — a string containing JSON inside a JSON log line, worse than either.)
 *
 * <p><strong>Keys are namespaced {@code event.*}</strong> so an attribute can never collide with —
 * or worse, overwrite — a context key the request filter owns. {@code event.traceId} would be a
 * confusing field; silently clobbering the real {@code traceId} would be a bug that costs an
 * afternoon.
 *
 * <p><strong>Why it swallows everything.</strong> The {@link Analytics} contract promises callers
 * that telemetry cannot fail their work. Logging rarely throws — but "rarely" is the wrong bar for
 * code sitting in the path of every product action, and the catch costs nothing. The failure is
 * logged at warn: the event is lost either way, and silently losing events is how a funnel quietly
 * becomes wrong.
 */
@Component
class LoggingAnalytics implements Analytics {

    private static final Logger log = LoggerFactory.getLogger("com.largata.analytics");

    /** Namespace for attribute keys on the MDC — see the class note on collisions. */
    private static final String ATTRIBUTE_PREFIX = "event.";

    @Override
    public void emit(AnalyticsEvent event) {
        try {
            logWithAttributes(event);
        } catch (RuntimeException telemetryIsNeverWorthAFailedRequest) {
            log.warn("Analytics event dropped: event={}", event.name(), telemetryIsNeverWorthAFailedRequest);
        }
    }

    private void logWithAttributes(AnalyticsEvent event) {
        // The try opens BEFORE the first put, not after the loop: converting an attribute can throw
        // (any value's toString() can), and a throw midway through the loop would leave the keys set
        // so far behind on this thread. Found by test, not by inspection — the leak needed a
        // hostile attribute *and* a surviving one to become visible.
        try {
            for (Map.Entry<String, Object> attribute : event.attributes().entrySet()) {
                MDC.put(ATTRIBUTE_PREFIX + attribute.getKey(), String.valueOf(attribute.getValue()));
            }
            // The message names the event; the attributes are fields beside it. A reader greps the
            // logger, a query filters on event= — neither has to parse this string.
            log.info("event={}", event.name());
        } finally {
            // Scoped to this call, always: the MDC is thread-local and threads are pooled, so a
            // leaked key would reappear on an unrelated request's log lines further down the pool.
            event.attributes().keySet().forEach(key -> MDC.remove(ATTRIBUTE_PREFIX + key));
        }
    }
}
