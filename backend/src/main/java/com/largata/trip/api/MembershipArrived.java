package com.largata.trip.api;

import java.util.UUID;


public record MembershipArrived(UUID workspaceId, UUID tripId, UUID travelerId) {}
