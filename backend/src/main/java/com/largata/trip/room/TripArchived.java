package com.largata.trip.room;

import java.util.UUID;


public record TripArchived(UUID tripId, UUID workspaceId, UUID byTravelerId) {}
