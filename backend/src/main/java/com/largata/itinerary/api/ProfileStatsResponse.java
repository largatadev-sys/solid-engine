package com.largata.itinerary.api;


public record ProfileStatsResponse(
        long publishedCount, long destinationCount, long followersCount, long followingCount) {}
