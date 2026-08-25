package com.largata.itinerary.api;

import com.largata.common.api.Page;
import com.largata.identity.api.TravelerCardResponse;
import java.util.List;


public record PeoplePageResponse(
        List<TravelerCardResponse> items, String nextCursor, long totalCount) {

    public static PeoplePageResponse of(Page<TravelerCardResponse> page, long totalCount) {
        return new PeoplePageResponse(page.items(), page.nextCursor(), totalCount);
    }
}
