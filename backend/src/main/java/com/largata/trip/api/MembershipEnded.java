package com.largata.trip.api;

import java.util.UUID;


public record MembershipEnded(UUID tripId, UUID travelerId) {}
