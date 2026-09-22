package com.largata.trip.room;

import static com.largata.trip.room.Door.Rule.EDITABLE;
import static com.largata.trip.room.Door.Rule.MEMBERSHIP_MUTABLE;
import static com.largata.trip.room.Door.Rule.OPEN;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.largata.identity.Traveler;
import com.largata.identity.web.CurrentTravelers;
import com.largata.trip.exception.ItineraryNotFoundException;
import com.largata.trip.exception.ItineraryPublishedException;
import com.largata.trip.exception.MembershipFrozenException;
import java.lang.reflect.Method;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.web.method.HandlerMethod;


class WorkspaceThresholdTest {

    private static final UUID TRIP = UUID.randomUUID();
    private static final UUID MEMBER = UUID.randomUUID();
    private static final UUID OWNER = UUID.randomUUID();
    private static final UUID STRANGER = UUID.randomUUID();


    static final class Handlers {
        void read() {}

        void undeclaredWrite() {}

        @Door(OPEN)
        void open() {}

        @Door(EDITABLE)
        void editable() {}

        @Door(MEMBERSHIP_MUTABLE)
        void roster() {}

        @Door(OPEN)
        @ReachesClosedRoom
        void undo() {}

        @ReachesClosedRoom
        void undoWithoutADoor() {}
    }


    @Test
    void theScopeIsExactlyATripNamedByItsId() {
        assertThat(WorkspaceThreshold.tripIdIn("/v1/trips/" + TRIP)).contains(TRIP);
        assertThat(WorkspaceThreshold.tripIdIn("/v1/trips/" + TRIP + "/days/" + UUID.randomUUID() + "/activities"))
                .contains(TRIP);

        assertThat(WorkspaceThreshold.tripIdIn("/v1/trips")).isEmpty();
        assertThat(WorkspaceThreshold.tripIdIn("/v1/trips/not-an-id/days")).isEmpty();
        assertThat(WorkspaceThreshold.tripIdIn("/v1/itineraries/" + TRIP)).isEmpty();
        assertThat(WorkspaceThreshold.tripIdIn("/v1/itineraries/" + TRIP + "/diary/entries")).isEmpty();
        assertThat(WorkspaceThreshold.tripIdIn("/v1/join/some-token")).isEmpty();
        assertThat(WorkspaceThreshold.tripIdIn("/v1/me")).isEmpty();
    }


    @Test
    void aRouteOutsideTheScopeIsNotTouched() {
        WorkspaceThreshold threshold = threshold(STRANGER, false, false, UndeclaredWrites.REFUSED);
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/v1/trips");

        assertThat(threshold.preHandle(request, new MockHttpServletResponse(), handler("undeclaredWrite"))).isTrue();
        assertThat(request.getAttribute(WorkspaceThreshold.MEMBERSHIP_ATTRIBUTE)).isNull();
    }


    @Test
    void aStrangerHearsTheMaskBeforeAnythingElse() {
        WorkspaceThreshold threshold = threshold(STRANGER, true, true, UndeclaredWrites.REFUSED);

        assertThatThrownBy(() -> cross(threshold, "POST", "/days", "undeclaredWrite"))
                .isInstanceOf(ItineraryNotFoundException.class);
    }


    @Test
    void aClosedRoomIsNotFoundForAMemberAndForItsOwnerAlike() {
        assertThatThrownBy(() -> cross(threshold(MEMBER, true, false, UndeclaredWrites.REFUSED), "GET", "", "read"))
                .isInstanceOf(ItineraryNotFoundException.class);
        assertThatThrownBy(() -> cross(threshold(OWNER, true, false, UndeclaredWrites.REFUSED), "GET", "", "read"))
                .isInstanceOf(ItineraryNotFoundException.class);
    }


    @Test
    void onlyAHandlerThatReachesAClosedRoomGetsThroughIt() {
        WorkspaceThreshold threshold = threshold(OWNER, true, false, UndeclaredWrites.REFUSED);
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/v1/trips/" + TRIP + "/unarchive");

        assertThat(threshold.preHandle(request, new MockHttpServletResponse(), handler("undo"))).isTrue();
        assertThat(request.getAttribute(WorkspaceThreshold.MEMBERSHIP_ATTRIBUTE))
                .isEqualTo(new Membership(OWNER, TRIP, Role.OWNER));
    }


    @Test
    void reachingAClosedRoomDoesNotExcuseAWriteFromDeclaringItsDoor() {
        WorkspaceThreshold threshold = threshold(OWNER, true, false, UndeclaredWrites.REFUSED);

        assertThatThrownBy(() -> cross(threshold, "POST", "/unarchive", "undoWithoutADoor"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Handlers.undoWithoutADoor");
    }


    @Test
    void aReadNeedsNoDoorAndArrivesWithTheMembership() {
        WorkspaceThreshold threshold = threshold(MEMBER, false, true, UndeclaredWrites.REFUSED);
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/v1/trips/" + TRIP);

        assertThat(threshold.preHandle(request, new MockHttpServletResponse(), handler("read"))).isTrue();
        assertThat(request.getAttribute(WorkspaceThreshold.MEMBERSHIP_ATTRIBUTE))
                .isEqualTo(new Membership(MEMBER, TRIP, Role.MEMBER));
    }


    @Test
    void anUndeclaredWriteIsACodingMistakeNamedByHandler() {
        WorkspaceThreshold threshold = threshold(MEMBER, false, false, UndeclaredWrites.REFUSED);

        assertThatThrownBy(() -> cross(threshold, "POST", "/days", "undeclaredWrite"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Handlers.undeclaredWrite");
    }


    @Test
    void whileTheProofsStillGuardAnUndeclaredWritePassesThrough() {
        WorkspaceThreshold threshold =
                threshold(MEMBER, false, false, UndeclaredWrites.ALLOWED_WHILE_THE_PROOFS_STILL_GUARD);

        assertThatCode(() -> cross(threshold, "POST", "/days", "undeclaredWrite")).doesNotThrowAnyException();
    }


    @Test
    void theEditableDoorRefusesAPublishedTripWithTheFreeze() {
        assertThatThrownBy(() -> cross(threshold(MEMBER, false, true, UndeclaredWrites.REFUSED), "PATCH", "/days/x", "editable"))
                .isInstanceOf(ItineraryPublishedException.class);
        assertThatCode(() -> cross(threshold(MEMBER, false, false, UndeclaredWrites.REFUSED), "PATCH", "/days/x", "editable"))
                .doesNotThrowAnyException();
    }


    @Test
    void theRosterDoorRefusesAPublishedTripWithItsOwnWords() {
        assertThatThrownBy(() -> cross(threshold(OWNER, false, true, UndeclaredWrites.REFUSED), "POST", "/invitations", "roster"))
                .isInstanceOf(MembershipFrozenException.class);
    }


    @Test
    void theOpenDoorSurvivesPublication() {
        assertThatCode(() -> cross(threshold(MEMBER, false, true, UndeclaredWrites.REFUSED), "POST", "/polls", "open"))
                .doesNotThrowAnyException();
    }


    @Test
    void theMaskOutranksTheFreeze() {
        assertThatThrownBy(() -> cross(threshold(MEMBER, true, true, UndeclaredWrites.REFUSED), "PATCH", "/days/x", "editable"))
                .isInstanceOf(ItineraryNotFoundException.class);
    }


    @Test
    void theThresholdIsWhoIsAskingTheGuardTheFenceAndAPolicy() {
        assertThatThrownBy(() -> new WorkspaceThreshold(null, guardKnowing(MEMBER), fence(false, false), UndeclaredWrites.REFUSED))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new WorkspaceThreshold(asking(MEMBER), guardKnowing(MEMBER), fence(false, false), null))
                .isInstanceOf(IllegalArgumentException.class);
    }


    private static void cross(WorkspaceThreshold threshold, String httpMethod, String tail, String handler) {
        threshold.preHandle(
                new MockHttpServletRequest(httpMethod, "/v1/trips/" + TRIP + tail),
                new MockHttpServletResponse(),
                handler(handler));
    }


    private static WorkspaceThreshold threshold(
            UUID asking, boolean archived, boolean published, UndeclaredWrites policy) {
        return new WorkspaceThreshold(asking(asking), guardKnowing(MEMBER, OWNER), fence(archived, published), policy);
    }


    private static CurrentTravelers asking(UUID travelerId) {
        Traveler traveler = mock(Traveler.class);
        when(traveler.id()).thenReturn(travelerId);
        return () -> traveler;
    }


    private static AuthorizationGuard guardKnowing(UUID... travelers) {
        return new AuthorizationGuard(
                (travelerId, itineraryId) -> {
                    if (travelerId.equals(OWNER) && contains(travelers, OWNER)) {
                        return Optional.of(new Membership(travelerId, itineraryId, Role.OWNER));
                    }
                    if (travelerId.equals(MEMBER) && contains(travelers, MEMBER)) {
                        return Optional.of(new Membership(travelerId, itineraryId, Role.MEMBER));
                    }
                    return Optional.empty();
                });
    }


    private static boolean contains(UUID[] travelers, UUID who) {
        for (UUID t : travelers) {
            if (t.equals(who)) {
                return true;
            }
        }
        return false;
    }


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


    private static HandlerMethod handler(String name) {
        try {
            Method method = Handlers.class.getDeclaredMethod(name);
            return new HandlerMethod(new Handlers(), method);
        } catch (NoSuchMethodException e) {
            throw new IllegalStateException(e);
        }
    }
}
