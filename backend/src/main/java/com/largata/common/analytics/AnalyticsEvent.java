package com.largata.common.analytics;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * One product event: a name and its attributes (register #2).
 *
 * <p><strong>Attributes are IDs and shape only — never user content.</strong> P3 forbids logging
 * PII and secrets, and this seam does not get an exemption for being "analytics": the sink today is
 * a log line, and the sink tomorrow is a durable store that outlives the request by years. A trip's
 * title and destinations are the traveler's words about their own life; {@code destinationCount} is
 * what the funnel actually needs.
 *
 * <p>That rule is a discipline at the call sites, not something this type can enforce — a bag of
 * {@code Object} cannot tell an id from a confession. It is held instead by a test per call site
 * (e.g. {@code ItineraryAnalyticsIT#theEventNamesTheTripByIdAndLeaksNothingTheTravelerWrote}), which
 * is the honest place for it: the question "is this attribute PII" is only answerable where the
 * value is chosen.
 */
public record AnalyticsEvent(String name, Map<String, Object> attributes) {

    public AnalyticsEvent {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("An analytics event needs a name");
        }
        // unmodifiableMap over a LinkedHashMap copy, not Map.copyOf: Map.copyOf's iteration order is
        // unspecified, which would silently throw away the builder's insertion order and scatter the
        // fields of a log line differently on every run. Copy first, then wrap — the copy is what
        // makes it immutable (the caller cannot keep a handle), the wrapper is what says so.
        attributes = Collections.unmodifiableMap(new LinkedHashMap<>(attributes));
    }

    public static Builder named(String name) {
        return new Builder(name);
    }

    /** Small by design: an event is a name and a flat bag of scalars. */
    public static final class Builder {

        private final String name;
        private final Map<String, Object> attributes = new LinkedHashMap<>();

        private Builder(String name) {
            this.name = name;
        }

        public Builder with(String key, Object value) {
            attributes.put(key, value);
            return this;
        }

        public AnalyticsEvent build() {
            return new AnalyticsEvent(name, attributes);
        }
    }
}
