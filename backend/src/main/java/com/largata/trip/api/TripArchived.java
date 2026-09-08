package com.largata.trip.api;

import java.util.UUID;


public record TripArchived(UUID tripId, UUID workspaceId, UUID byTravelerId) {}
