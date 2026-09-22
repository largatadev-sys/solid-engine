package com.largata.trip.room;

import com.largata.trip.exception.ItineraryNotFoundException;
import com.largata.trip.exception.ItineraryPublishedException;
import com.largata.trip.exception.MembershipFrozenException;
import java.util.UUID;
import java.util.function.Supplier;


public final class TripFence {

    private final ArchiveState room;
    private final PublicationState publication;

    public TripFence(ArchiveState room, PublicationState publication) {
        if (room == null || publication == null) {
            throw new IllegalArgumentException("A fence is two facts about a trip, and nothing else");
        }
        this.room = room;
        this.publication = publication;
    }


    public void requireOpenRoom(UUID tripId) {
        requireOpenRoom(tripId, ItineraryNotFoundException::new);
    }


    public void requireOpenRoom(UUID tripId, Supplier<? extends RuntimeException> refusal) {
        if (tripId == null || refusal == null) {
            throw new IllegalArgumentException("An act on a trip names the trip and its refusal");
        }
        if (room.isArchived(tripId)) {
            throw refusal.get();
        }
    }


    public void requireUnfrozen(UUID tripId, Supplier<? extends RuntimeException> refusal) {
        if (tripId == null || refusal == null) {
            throw new IllegalArgumentException("An act on a trip names the trip and its refusal");
        }
        requireNoLivePublication(tripId, refusal);
    }


    public Owner owner(Membership member, Supplier<? extends RuntimeException> refusal) {
        requireOpenRoom(member);
        return Owner.of(member, refusal);
    }


    public <S extends Standing> InAudience<S> inAudience(S standing) {
        requireOpenRoom(standing);
        return new InAudience<>(standing);
    }


    public <S extends Standing> Writable<S> writable(S standing) {
        requireOpenRoom(standing);
        return new Writable<>(standing);
    }


    public <S extends Standing> Editable<S> editable(S standing) {
        return editable(standing, ItineraryPublishedException::new);
    }


    public <S extends Standing> Editable<S> editable(
            S standing, Supplier<? extends RuntimeException> refusal) {
        requireOpenRoom(standing);
        requireNoLivePublication(standing.membership().itineraryId(), refusal);
        return new Editable<>(standing);
    }


    public <S extends Standing> MembershipMutable<S> membershipMutable(S standing) {
        return membershipMutable(standing, MembershipFrozenException::new);
    }


    public <S extends Standing> MembershipMutable<S> membershipMutable(
            S standing, Supplier<? extends RuntimeException> refusal) {
        requireOpenRoom(standing);
        requireNoLivePublication(standing.membership().itineraryId(), refusal);
        return new MembershipMutable<>(standing);
    }


    public Unfrozen unfrozen(UUID tripId) {
        return unfrozen(tripId, MembershipFrozenException::new);
    }


    public Unfrozen unfrozen(UUID tripId, Supplier<? extends RuntimeException> refusal) {
        if (tripId == null) {
            throw new IllegalArgumentException("An act on a trip names the trip");
        }
        requireNoLivePublication(tripId, refusal);
        return new Unfrozen(tripId);
    }


    private void requireOpenRoom(Standing standing) {
        if (standing == null) {
            throw new IllegalArgumentException("A door is opened by somebody");
        }
        if (room.isArchived(standing.membership().itineraryId())) {
            throw new ItineraryNotFoundException();
        }
    }


    private void requireNoLivePublication(UUID tripId, Supplier<? extends RuntimeException> refusal) {
        if (publication.isPublished(tripId)) {
            throw refusal.get();
        }
    }


    public static final class InAudience<S extends Standing> {

        private final S standing;

        private InAudience(S standing) {
            this.standing = standing;
        }

        public S standing() {
            return standing;
        }

        public Membership member() {
            return standing.membership();
        }
    }


    public static final class Writable<S extends Standing> {

        private final S standing;

        private Writable(S standing) {
            this.standing = standing;
        }

        public S standing() {
            return standing;
        }

        public Membership member() {
            return standing.membership();
        }
    }


    public static final class Editable<S extends Standing> {

        private final S standing;

        private Editable(S standing) {
            this.standing = standing;
        }

        public S standing() {
            return standing;
        }

        public Membership member() {
            return standing.membership();
        }
    }


    public static final class MembershipMutable<S extends Standing> {

        private final S standing;

        private MembershipMutable(S standing) {
            this.standing = standing;
        }

        public S standing() {
            return standing;
        }

        public Membership member() {
            return standing.membership();
        }
    }


    public static final class Unfrozen {

        private final UUID tripId;

        private Unfrozen(UUID tripId) {
            this.tripId = tripId;
        }

        public UUID tripId() {
            return tripId;
        }
    }
}
