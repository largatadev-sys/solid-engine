package com.largata.common.authz;

import org.springframework.stereotype.Component;


@Component
public class SightFence {

    private final TripWritability archive;

    public SightFence(TripWritability archive) {
        this.archive = archive;
    }


    public void requireInSight(Membership member) {
        if (!member.isOwner() && archive.isFrozen(member.itineraryId())) {
            throw new ItineraryNotFoundException();
        }
    }
}
