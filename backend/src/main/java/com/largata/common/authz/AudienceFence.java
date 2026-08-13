package com.largata.common.authz;

import org.springframework.stereotype.Component;


@Component
public class AudienceFence {

    private final TripWritability writability;

    public AudienceFence(TripWritability writability) {
        this.writability = writability;
    }


    public InAudience requireInAudience(Membership member) {
        if (!member.isOwner() && writability.isFrozen(member.itineraryId())) {
            throw new ItineraryNotFoundException();
        }
        return new InAudience(member);
    }
}
