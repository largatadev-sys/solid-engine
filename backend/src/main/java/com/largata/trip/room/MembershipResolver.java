package com.largata.trip.room;

import java.util.Optional;
import java.util.UUID;


public interface MembershipResolver {


    Optional<Membership> resolve(UUID travelerId, UUID itineraryId);
}
