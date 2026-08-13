package com.largata.itinerary.api;


public record TrendingDestinationResponse(
        String destination, long tripCount, String coverImageUrl) {}
