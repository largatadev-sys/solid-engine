package com.largata.ws;

import java.util.Optional;
import java.util.UUID;


public record Topic(UUID itinerary, String channel) {

    public static final String DEBUG_ECHO = "debug:echo";

    private static final String ITINERARY_PREFIX = "itinerary:";

    private static final String ECHO_CHANNEL = "echo";

    public static Optional<Topic> parse(String name) {
        if (name == null || name.isEmpty()) {
            return Optional.empty();
        }
        if (DEBUG_ECHO.equals(name)) {
            return Optional.of(debugEcho());
        }
        if (!name.startsWith(ITINERARY_PREFIX)) {
            return Optional.empty();
        }
        String[] parts = name.split(":", -1);
        if (parts.length != 3 || parts[2].isEmpty()) {
            return Optional.empty();
        }
        return parseUuid(parts[1]).map(itinerary -> new Topic(itinerary, parts[2]));
    }


    public static Topic debugEcho() {
        return new Topic(null, ECHO_CHANNEL);
    }


    public static Topic ofItinerary(UUID itineraryId, String channel) {
        return new Topic(itineraryId, channel);
    }


    public String name() {
        return isDebugEcho() ? DEBUG_ECHO : ITINERARY_PREFIX + itinerary + ":" + channel;
    }


    public Optional<UUID> itineraryId() {
        return Optional.ofNullable(itinerary);
    }


    public boolean isDebugEcho() {
        return itinerary == null && ECHO_CHANNEL.equals(channel);
    }

    private static Optional<UUID> parseUuid(String candidate) {
        try {
            return Optional.of(UUID.fromString(candidate));
        } catch (IllegalArgumentException notAUuid) {
            return Optional.empty();
        }
    }
}
