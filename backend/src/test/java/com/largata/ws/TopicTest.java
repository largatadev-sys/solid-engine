package com.largata.ws;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.UUID;
import org.junit.jupiter.api.Test;

class TopicTest {

    private static final UUID ITINERARY = UUID.fromString("0198a7c0-1111-7000-8000-000000000001");

    private static final UUID TRAVELER = UUID.fromString("0198a7c0-2222-7000-8000-000000000002");

    @Test
    void anItineraryTopicParsesToItsItineraryAndChannel() {
        Topic topic = Topic.parse("itinerary:" + ITINERARY + ":chat").orElseThrow();

        assertThat(topic.itineraryId()).contains(ITINERARY);
        assertThat(topic.channel()).isEqualTo("chat");
        assertThat(topic.name()).isEqualTo("itinerary:" + ITINERARY + ":chat");
    }

    @Test
    void theDebugEchoTopicParsesAndNamesNoItinerary() {
        Topic topic = Topic.parse("debug:echo").orElseThrow();

        assertThat(topic.itineraryId()).isEmpty();
        assertThat(topic.isDebugEcho()).isTrue();
    }

    @Test
    void anItineraryTopicIsNotTheDebugTopic() {
        assertThat(Topic.parse("itinerary:" + ITINERARY + ":chat").orElseThrow().isDebugEcho()).isFalse();
    }

    @Test
    void aMalformedItineraryIdIsRefusedRatherThanThrowing() {
        assertThat(Topic.parse("itinerary:not-a-uuid:chat")).isEmpty();
    }

    @Test
    void unknownShapesAreRefused() {
        assertThat(Topic.parse("itinerary:" + ITINERARY)).isEmpty();
        assertThat(Topic.parse("itinerary:" + ITINERARY + ":chat:extra")).isEmpty();
        assertThat(Topic.parse("nonsense")).isEmpty();
        assertThat(Topic.parse("debug:something-else")).isEmpty();
        assertThat(Topic.parse("")).isEmpty();
        assertThat(Topic.parse(null)).isEmpty();
    }

    @Test
    void aBlankChannelIsRefusedSoTheTrailingColonCannotSubscribeToNothing() {
        assertThat(Topic.parse("itinerary:" + ITINERARY + ":")).isEmpty();
    }

    @Test
    void anItineraryTopicIsBuildableFromItsPartsAndRoundTrips() {
        Topic built = Topic.ofItinerary(ITINERARY, "chat");

        assertThat(Topic.parse(built.name())).contains(built);
    }

    @Test
    void twoTopicsNamingTheSameThingAreEqualSoTheyKeyOneRegistryEntry() {
        assertThat(Topic.parse("itinerary:" + ITINERARY + ":chat"))
                .contains(Topic.ofItinerary(ITINERARY, "chat"));
    }

    @Test
    void aTopicHasNoNameFieldToDisagreeWithItsPartsSoOneMeaningIsAlwaysOneRegistryKey() {
        Topic parsed = Topic.parse("itinerary:" + ITINERARY + ":chat").orElseThrow();
        Topic built = Topic.ofItinerary(ITINERARY, "chat");

        assertThat(parsed).isEqualTo(built).hasSameHashCodeAs(built);
        assertThat(parsed.name()).isEqualTo(built.name());
    }

    @Test
    void theDebugTopicIsEqualHoweverItWasObtained() {
        assertThat(Topic.parse(Topic.DEBUG_ECHO)).contains(Topic.debugEcho());
        assertThat(Topic.debugEcho().name()).isEqualTo(Topic.DEBUG_ECHO);
    }


    @Test
    void aTravelerTopicParsesToItsTravelerAndNamesNoItinerary() {
        Topic topic = Topic.parse("traveler:" + TRAVELER).orElseThrow();

        assertThat(topic.travelerId()).contains(TRAVELER);
        assertThat(topic.itineraryId()).isEmpty();
        assertThat(topic.isDebugEcho()).isFalse();
        assertThat(topic.name()).isEqualTo("traveler:" + TRAVELER);
    }

    @Test
    void aTravelerTopicTakesNoChannelSegmentBecauseASubsetHasNoConsumer() {
        assertThat(Topic.parse("traveler:" + TRAVELER + ":trips")).isEmpty();
        assertThat(Topic.parse("traveler:" + TRAVELER + ":")).isEmpty();
    }

    @Test
    void aMalformedTravelerIdIsRefusedRatherThanThrowing() {
        assertThat(Topic.parse("traveler:not-a-uuid")).isEmpty();
        assertThat(Topic.parse("traveler:")).isEmpty();
        assertThat(Topic.parse("traveler")).isEmpty();
    }

    @Test
    void aTravelerTopicIsBuildableFromItsPartsAndRoundTrips() {
        Topic built = Topic.ofTraveler(TRAVELER);

        assertThat(Topic.parse(built.name())).contains(built);
    }

    @Test
    void aTravelerTopicIsNeverEqualToAnItineraryTopicSharingItsUuid() {
        assertThat(Topic.ofTraveler(ITINERARY)).isNotEqualTo(Topic.ofItinerary(ITINERARY, "chat"));
        assertThat(Topic.ofTraveler(ITINERARY).name()).isNotEqualTo(Topic.ofItinerary(ITINERARY, "chat").name());
    }
}
