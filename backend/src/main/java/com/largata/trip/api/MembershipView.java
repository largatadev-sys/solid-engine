package com.largata.trip.api;

import com.largata.trip.api.Role;
import java.time.Instant;
import java.util.UUID;


public record MembershipView(UUID travelerId, Role role, Instant joinedAt) {}
