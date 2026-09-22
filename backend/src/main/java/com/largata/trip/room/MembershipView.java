package com.largata.trip.room;

import java.time.Instant;
import java.util.UUID;


public record MembershipView(UUID travelerId, Role role, Instant joinedAt) {}
