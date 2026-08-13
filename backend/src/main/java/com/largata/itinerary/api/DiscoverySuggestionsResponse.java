package com.largata.itinerary.api;

import java.util.List;


public record DiscoverySuggestionsResponse(
        List<String> destinations, List<String> itineraries) {}
