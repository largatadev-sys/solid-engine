package com.largata.identity.api;

import java.time.Instant;


public record FollowRequestResponse(TravelerCardResponse traveler, Instant requestedAt) {}
