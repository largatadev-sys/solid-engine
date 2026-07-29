package com.largata.common.analytics;

import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.stereotype.Component;


@Component
class LoggingAnalytics implements Analytics {

    private static final Logger log = LoggerFactory.getLogger("com.largata.analytics");


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
        try {
            for (Map.Entry<String, Object> attribute : event.attributes().entrySet()) {
                MDC.put(ATTRIBUTE_PREFIX + attribute.getKey(), String.valueOf(attribute.getValue()));
            }
            log.info("event={}", event.name());
        } finally {
            event.attributes().keySet().forEach(key -> MDC.remove(ATTRIBUTE_PREFIX + key));
        }
    }
}
