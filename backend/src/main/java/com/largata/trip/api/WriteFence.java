package com.largata.trip.api;

import java.util.UUID;
import org.springframework.stereotype.Component;


@Component
public class WriteFence {

    private final TripFence fence;

    public WriteFence(TripFence fence) {
        this.fence = fence;
    }


    public void requireWritable(Membership member) {
        fence.writable(member);
    }


    public void requireEditable(Membership member) {
        fence.editable(member);
    }


    public void requireMembershipMutable(Membership member) {
        fence.membershipMutable(member);
    }


    public void requireMembershipUnfrozen(UUID itineraryId) {
        fence.unfrozen(itineraryId);
    }
}
