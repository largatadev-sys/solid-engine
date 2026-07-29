package com.largata.common.authz;

import java.util.UUID;
import org.springframework.stereotype.Component;


@Component
public class AuthorizationGuard {

    private final MembershipResolver resolver;

    public AuthorizationGuard(MembershipResolver resolver) {
        this.resolver = resolver;
    }


    public Membership requireMember(UUID travelerId, UUID itineraryId) {
        return resolver.resolve(travelerId, itineraryId).orElseThrow(ItineraryNotFoundException::new);
    }
}
