package com.largata.profile.api;


public record ProfileStatsResponse(
        long publishedCount, long destinationCount, long followersCount, long followingCount) {}
