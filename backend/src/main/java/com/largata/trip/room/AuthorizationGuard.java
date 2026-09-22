package com.largata.trip.room;

import com.largata.trip.exception.ItineraryNotFoundException;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Component;


@Component
public class AuthorizationGuard {

    private final MembershipResolver resolver;

    public AuthorizationGuard(MembershipResolver resolver) {
        this.resolver = resolver;
    }


    public Membership requireMember(UUID travelerId, UUID itineraryId) {
        return membershipOf(travelerId, itineraryId).orElseThrow(ItineraryNotFoundException::new);
    }


    public Optional<Membership> membershipOf(UUID travelerId, UUID itineraryId) {
        return resolver.resolve(travelerId, itineraryId);
    }
}
