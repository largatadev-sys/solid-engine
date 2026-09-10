package com.largata.profile.dto;


public record ProfileStatsResponse(
        long publishedCount, long destinationCount, long followersCount, long followingCount) {}
