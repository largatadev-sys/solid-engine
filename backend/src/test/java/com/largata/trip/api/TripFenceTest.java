package com.largata.trip.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.largata.common.error.ForbiddenException;
import com.largata.common.id.UuidV7;
import com.largata.trip.exception.ItineraryNotFoundException;
import com.largata.trip.exception.ItineraryPublishedException;
import com.largata.trip.exception.MembershipFrozenException;
import com.largata.trip.exception.NotTheTripOwnerException;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;


class TripFenceTest {

    private static final UUID TRIP = UuidV7.generate();
    private static final UUID ANA = UuidV7.generate();
    private static final UUID BEN = UuidV7.generate();

    private static final Membership OWNER_MEMBER = new Membership(ANA, TRIP, Role.OWNER);
    private static final Membership PLAIN_MEMBER = new Membership(BEN, TRIP, Role.MEMBER);


    private static TripFence fence(boolean archived, boolean published) {
        return new TripFence(
                tripId -> archived,
                new PublicationState() {
                    @Override
                    public boolean isPublished(UUID tripId) {
                        return published;
                    }

                    @Override
                    public Optional<LivePublication> liveFor(UUID tripId) {
                        return Optional.empty();
                    }
                });
    }


    private static TripFence openAndUnpublished() {
        return fence(false, false);
    }


    private static TripFence openAndPublished() {
        return fence(false, true);
    }


    private static TripFence archived() {
        return fence(true, false);
    }


    private static Owner owner() {
        return Owner.of(OWNER_MEMBER, () -> NotTheTripOwnerException.toStartOrCompleteTheTrip());
    }


    @Test
    void anOpenRoomOpensEveryDoorForEveryStanding() {
        TripFence fence = openAndUnpublished();

        assertThat(fence.inAudience(PLAIN_MEMBER).member()).isEqualTo(PLAIN_MEMBER);
        assertThat(fence.writable(PLAIN_MEMBER).member()).isEqualTo(PLAIN_MEMBER);
        assertThat(fence.editable(PLAIN_MEMBER).member()).isEqualTo(PLAIN_MEMBER);
        assertThat(fence.membershipMutable(PLAIN_MEMBER).member()).isEqualTo(PLAIN_MEMBER);
        assertThat(fence.unfrozen(TRIP).tripId()).isEqualTo(TRIP);

        Owner owner = owner();
        assertThat(fence.inAudience(owner).standing()).isEqualTo(owner);
        assertThat(fence.writable(owner).standing()).isEqualTo(owner);
        assertThat(fence.editable(owner).standing()).isEqualTo(owner);
        assertThat(fence.membershipMutable(owner).standing()).isEqualTo(owner);
    }


    @Test
    void aDeletedTripIsNotFoundAtEveryDoorForAMember() {
        TripFence fence = archived();

        assertThatThrownBy(() -> fence.inAudience(PLAIN_MEMBER)).isInstanceOf(ItineraryNotFoundException.class);
        assertThatThrownBy(() -> fence.writable(PLAIN_MEMBER)).isInstanceOf(ItineraryNotFoundException.class);
        assertThatThrownBy(() -> fence.editable(PLAIN_MEMBER)).isInstanceOf(ItineraryNotFoundException.class);
        assertThatThrownBy(() -> fence.membershipMutable(PLAIN_MEMBER))
                .isInstanceOf(ItineraryNotFoundException.class);
    }


    @Test
    void aDeletedTripIsNotFoundAtEveryDoorForItsOWNER_too() {
        TripFence fence = archived();
        Owner owner = owner();

        assertThatThrownBy(() -> fence.inAudience(owner))
                .as("ADR-040 supersedes S4.23's owner exception: delete means deleted, for everyone."
                        + " The owner used to hear TRIP_ARCHIVED here, which told them the trip they"
                        + " had just deleted was still there")
                .isInstanceOf(ItineraryNotFoundException.class);
        assertThatThrownBy(() -> fence.writable(owner)).isInstanceOf(ItineraryNotFoundException.class);
        assertThatThrownBy(() -> fence.editable(owner)).isInstanceOf(ItineraryNotFoundException.class);
        assertThatThrownBy(() -> fence.membershipMutable(owner))
                .isInstanceOf(ItineraryNotFoundException.class);
    }


    @Test
    void theRoomIsCheckedBeforeThePublication_soADeletedPublishedTripIsNotFoundRatherThanFrozen() {
        TripFence fence = fence(true, true);

        assertThatThrownBy(() -> fence.editable(PLAIN_MEMBER))
                .as("a traveler who cannot see the trip must not learn from the refusal that it is"
                        + " published — not-found is the outer answer and stays outermost")
                .isInstanceOf(ItineraryNotFoundException.class);
        assertThatThrownBy(() -> fence.membershipMutable(PLAIN_MEMBER))
                .isInstanceOf(ItineraryNotFoundException.class);
    }


    @Test
    void aLivePublicationClosesOnlyTheDoorsThatChangeThePlanOrTheRoster() {
        TripFence fence = openAndPublished();

        assertThat(fence.inAudience(PLAIN_MEMBER).member())
                .as("reading a published trip is exactly what publishing is for")
                .isEqualTo(PLAIN_MEMBER);
        assertThat(fence.writable(PLAIN_MEMBER).member())
                .as("the room stays open: chat, polls and the photo dump survive publication")
                .isEqualTo(PLAIN_MEMBER);

        assertThatThrownBy(() -> fence.editable(PLAIN_MEMBER))
                .isInstanceOf(ItineraryPublishedException.class);
        assertThatThrownBy(() -> fence.membershipMutable(PLAIN_MEMBER))
                .isInstanceOf(MembershipFrozenException.class);
        assertThatThrownBy(() -> fence.unfrozen(TRIP)).isInstanceOf(MembershipFrozenException.class);
    }


    @Test
    void aLivePublicationRefusesTheOwnerAtThoseDoorsToo() {
        TripFence fence = openAndPublished();
        Owner owner = owner();

        assertThatThrownBy(() -> fence.editable(owner))
                .as("the freeze is about the plan, not about who is asking — republish is the"
                        + " deliberate act that changes a published trip (ADR-018)")
                .isInstanceOf(ItineraryPublishedException.class);
        assertThatThrownBy(() -> fence.membershipMutable(owner))
                .isInstanceOf(MembershipFrozenException.class);
    }


    @Test
    void everyFrozenDoorLetsTheSurfaceNameItsOwnRefusal() {
        TripFence fence = openAndPublished();

        assertThatThrownBy(() -> fence.editable(PLAIN_MEMBER, ChatClosedException::new))
                .as("chat says CHAT_CLOSED for the same fact; the fence proves the state and the"
                        + " surface names the refusal, so nothing re-derives the freeze")
                .isInstanceOf(ChatClosedException.class);
        assertThatThrownBy(() -> fence.membershipMutable(PLAIN_MEMBER, ChatClosedException::new))
                .isInstanceOf(ChatClosedException.class);
        assertThatThrownBy(() -> fence.unfrozen(TRIP, ChatClosedException::new))
                .isInstanceOf(ChatClosedException.class);
    }


    @Test
    void theRefusalOverloadIsNotConsultedWhenTheDoorOpens() {
        TripFence fence = openAndUnpublished();

        assertThat(fence.editable(PLAIN_MEMBER, ChatClosedException::new).member()).isEqualTo(PLAIN_MEMBER);
        assertThat(fence.unfrozen(TRIP, ChatClosedException::new).tripId()).isEqualTo(TRIP);
    }


    @Test
    void anArchivedTripStillAnswersUnfrozenByTripId_becauseItAsksOnlyAboutPublication() {
        TripFence fence = archived();

        assertThat(fence.unfrozen(TRIP).tripId())
                .as("unfrozen is the door for acts by NON-members, who have no standing to check a"
                        + " room against; the surfaces that use it consult the archived set themselves")
                .isEqualTo(TRIP);
    }


    @Test
    void theStateProofCarriesTheStandingItWasMintedFor() {
        TripFence fence = openAndUnpublished();
        Owner owner = owner();

        TripFence.Editable<Owner> editable = fence.editable(owner);
        TripFence.Writable<Membership> writable = fence.writable(PLAIN_MEMBER);

        assertThat(editable.standing()).isEqualTo(owner);
        assertThat(editable.member())
                .as("Editable<Owner> is a different type from Editable<Membership>, so a service"
                        + " that requires an owner cannot be handed a member's proof")
                .isEqualTo(OWNER_MEMBER);
        assertThat(writable.standing()).isEqualTo(PLAIN_MEMBER);
    }


    @Test
    void ownerOfYieldsAValueForAnOwnerAndThrowsTheSuppliedRefusalForAnyoneElse() {
        Owner owner = Owner.of(OWNER_MEMBER, NotTheTripOwnerException::toRemoveAMember);

        assertThat(owner.membership()).isEqualTo(OWNER_MEMBER);

        assertThatThrownBy(() -> Owner.of(PLAIN_MEMBER, NotTheTripOwnerException::toRemoveAMember))
                .as("the owner is a fact about the membership already in hand — it needs no port,"
                        + " which is why it is a value rather than a door")
                .isInstanceOf(NotTheTripOwnerException.class)
                .hasMessage("Only the trip owner can remove a member.");
    }


    @Test
    void roleIsCheckedBeforeStateByConstruction() {
        TripFence fence = archived();

        assertThatThrownBy(
                        () ->
                                fence.editable(
                                        Owner.of(PLAIN_MEMBER, NotTheTripOwnerException::toRemoveAMember)))
                .as("the argument is evaluated before the call, so a non-owner hears `only the trip"
                        + " owner can…` whatever the room is doing — the ordering is the language's,"
                        + " not a rule anybody has to remember")
                .isInstanceOf(NotTheTripOwnerException.class);
    }


    @Test
    void aFenceNeedsBothItsFacts() {
        assertThatThrownBy(() -> new TripFence(null, openStateForTest()))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new TripFence(tripId -> false, null))
                .isInstanceOf(IllegalArgumentException.class);
    }


    private static PublicationState openStateForTest() {
        return new PublicationState() {
            @Override
            public boolean isPublished(UUID tripId) {
                return false;
            }

            @Override
            public Optional<LivePublication> liveFor(UUID tripId) {
                return Optional.empty();
            }
        };
    }


    private static final class ChatClosedException extends ForbiddenException {
        private ChatClosedException() {
            super("CHAT_CLOSED", "This trip is published, so its chat is closed.");
        }
    }
}
