package com.largata.discovery.api;


public record TrendingDestinationResponse(
        String destination, long tripCount, String coverImageUrl) {}
