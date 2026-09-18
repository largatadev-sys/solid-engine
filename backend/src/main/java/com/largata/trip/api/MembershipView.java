package com.largata.trip.api;

import java.time.Instant;
import java.util.UUID;


public record MembershipView(UUID travelerId, Role role, Instant joinedAt) {}
