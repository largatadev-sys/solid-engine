package com.largata.postcard.legacy;

import java.util.List;
import java.util.UUID;


public record PostDiaryEntryRequest(UUID activityId, String caption, List<UUID> fromDump) {

    public PostDiaryEntryRequest {
        fromDump = fromDump == null ? List.of() : List.copyOf(fromDump);
    }
}
