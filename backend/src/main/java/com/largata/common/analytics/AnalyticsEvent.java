package com.largata.common.analytics;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;


public record AnalyticsEvent(String name, Map<String, Object> attributes) {

    public AnalyticsEvent {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("An analytics event needs a name");
        }
        attributes = Collections.unmodifiableMap(new LinkedHashMap<>(attributes));
    }

    public static Builder named(String name) {
        return new Builder(name);
    }


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
