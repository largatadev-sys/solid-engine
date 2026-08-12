package com.largata.itinerary.api;

import java.util.List;
import java.util.UUID;


public record PostDiaryEntryRequest(
        UUID activityId, String caption, List<UUID> fromDump, Boolean shareToFeed) {

    public PostDiaryEntryRequest {
        fromDump = fromDump == null ? List.of() : List.copyOf(fromDump);
    }


    public boolean sharesToFeed() {
        return Boolean.TRUE.equals(shareToFeed);
    }
}
