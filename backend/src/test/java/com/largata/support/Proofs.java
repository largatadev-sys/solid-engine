package com.largata.support;

import com.largata.trip.room.Membership;
import com.largata.trip.room.Owner;
import com.largata.trip.room.TripFence;
import com.largata.trip.exception.NotTheTripOwnerException;


public final class Proofs {

    private final TripFence fence;

    public Proofs(TripFence fence) {
        this.fence = fence;
    }


    public TripFence.Editable<Membership> editable(Membership member) {
        return fence.editable(member);
    }


    public TripFence.Writable<Membership> writable(Membership member) {
        return fence.writable(member);
    }


    public TripFence.InAudience<Membership> inAudience(Membership member) {
        return fence.inAudience(member);
    }


    public TripFence.MembershipMutable<Membership> mutable(Membership member) {
        return fence.membershipMutable(member);
    }


    public TripFence.Editable<Owner> editableOwner(Membership member) {
        return fence.editable(owner(member));
    }


    public TripFence.Writable<Owner> writableOwner(Membership member) {
        return fence.writable(owner(member));
    }


    public TripFence.MembershipMutable<Owner> mutableOwner(Membership member) {
        return fence.membershipMutable(owner(member));
    }


    public Owner owner(Membership member) {
        return Owner.of(member, NotTheTripOwnerException::toStartOrCompleteTheTrip);
    }
}
