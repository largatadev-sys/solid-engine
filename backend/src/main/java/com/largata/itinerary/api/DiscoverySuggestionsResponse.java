package com.largata.itinerary.api;

import com.largata.identity.api.TravelerCardResponse;
import java.util.List;


public record DiscoverySuggestionsResponse(
        List<String> destinations,
        List<String> itineraries,
        List<TravelerCardResponse> people,
        boolean morePeople) {}
