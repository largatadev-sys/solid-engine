package com.largata.itinerary;

import java.time.Instant;
import java.util.UUID;


public record LeaseHolder(UUID travelerId, String handle, String displayName, String avatarUrl, Instant expiresAt) {}
