package com.largata.trip.api;

import org.springframework.stereotype.Component;


@Component
public class AudienceFence {

    private final TripFence fence;

    public AudienceFence(TripFence fence) {
        this.fence = fence;
    }


    public InAudience requireInAudience(Membership member) {
        fence.inAudience(member);
        return new InAudience(member);
    }
}
