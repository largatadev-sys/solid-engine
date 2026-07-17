package com.largata.common.analytics;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.Map;
import org.junit.jupiter.api.Test;

/** The event value type (S0.3, ticket 04). */
class AnalyticsEventTest {

    @Test
    void anEventIsANameAndAFlatBagOfAttributes() {
        AnalyticsEvent event =
                AnalyticsEvent.named("itinerary_created").with("destinationCount", 2).with("hasDates", true).build();

        assertThat(event.name()).isEqualTo("itinerary_created");
        assertThat(event.attributes()).containsExactly(Map.entry("destinationCount", 2), Map.entry("hasDates", true));
    }

    @Test
    void anEventWithoutANameIsNotAnEvent() {
        assertThatThrownBy(() -> AnalyticsEvent.named("  ").build()).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void theAttributesCannotBeChangedAfterTheEventIsBuilt() {
        AnalyticsEvent event = AnalyticsEvent.named("itinerary_created").with("a", 1).build();

        assertThatThrownBy(() -> event.attributes().put("b", 2))
                .isInstanceOf(UnsupportedOperationException.class);
    }

    @Test
    void aBuilderCannotReachBackIntoAnEventItAlreadyBuilt() {
        // The builder is reusable by shape; the events it made must not be. Without the defensive
        // copy in the compact constructor, a later .with() would mutate an event already emitted.
        AnalyticsEvent.Builder builder = AnalyticsEvent.named("itinerary_created").with("a", 1);
        AnalyticsEvent built = builder.build();

        builder.with("b", 2);

        assertThat(built.attributes()).containsOnlyKeys("a");
    }
}
