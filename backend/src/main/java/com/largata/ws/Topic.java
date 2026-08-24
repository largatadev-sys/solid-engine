package com.largata.ws;

import java.util.Optional;
import java.util.UUID;


public record Topic(UUID itinerary, UUID traveler, String channel) {

    public static final String DEBUG_ECHO = "debug:echo";

    private static final String ITINERARY_PREFIX = "itinerary:";

    private static final String TRAVELER_PREFIX = "traveler:";

    private static final String ECHO_CHANNEL = "echo";

    public static Optional<Topic> parse(String name) {
        if (name == null || name.isEmpty()) {
            return Optional.empty();
        }
        if (DEBUG_ECHO.equals(name)) {
            return Optional.of(debugEcho());
        }
        if (name.startsWith(TRAVELER_PREFIX)) {
            return parseTraveler(name);
        }
        if (!name.startsWith(ITINERARY_PREFIX)) {
            return Optional.empty();
        }
        String[] parts = name.split(":", -1);
        if (parts.length != 3 || parts[2].isEmpty()) {
            return Optional.empty();
        }
        return parseUuid(parts[1]).map(itinerary -> new Topic(itinerary, null, parts[2]));
    }


    public static Topic debugEcho() {
        return new Topic(null, null, ECHO_CHANNEL);
    }


    public static Topic ofItinerary(UUID itineraryId, String channel) {
        return new Topic(itineraryId, null, channel);
    }


    public static Topic ofTraveler(UUID travelerId) {
        return new Topic(null, travelerId, null);
    }


    public String name() {
        if (isDebugEcho()) {
            return DEBUG_ECHO;
        }
        if (traveler != null) {
            return TRAVELER_PREFIX + traveler;
        }
        return ITINERARY_PREFIX + itinerary + ":" + channel;
    }


    public Optional<UUID> itineraryId() {
        return Optional.ofNullable(itinerary);
    }


    public Optional<UUID> travelerId() {
        return Optional.ofNullable(traveler);
    }


    public boolean isDebugEcho() {
        return itinerary == null && traveler == null && ECHO_CHANNEL.equals(channel);
    }

    private static Optional<Topic> parseTraveler(String name) {
        String[] parts = name.split(":", -1);
        if (parts.length != 2) {
            return Optional.empty();
        }
        return parseUuid(parts[1]).map(Topic::ofTraveler);
    }

    private static Optional<UUID> parseUuid(String candidate) {
        try {
            return Optional.of(UUID.fromString(candidate));
        } catch (IllegalArgumentException notAUuid) {
            return Optional.empty();
        }
    }
}
