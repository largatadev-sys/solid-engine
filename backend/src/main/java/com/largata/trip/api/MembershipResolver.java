package com.largata.trip.api;

import java.util.Optional;
import java.util.UUID;


public interface MembershipResolver {


    Optional<Membership> resolve(UUID travelerId, UUID itineraryId);
}
