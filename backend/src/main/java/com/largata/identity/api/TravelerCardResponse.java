package com.largata.identity.api;

import com.largata.identity.TravelerSummary;
import java.util.UUID;


public record TravelerCardResponse(UUID id, String handle, String displayName, String avatarUrl) {

    public static TravelerCardResponse of(TravelerSummary summary) {
        return new TravelerCardResponse(
                summary.id(), summary.handle(), summary.displayName(), summary.avatarUrl());
    }
}
