package com.largata.common.authz;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.largata.common.id.UuidV7;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;


class AuthorizationGuardTest {

    private final UUID traveler = UuidV7.generate();
    private final UUID itinerary = UuidV7.generate();

    @Test
    void aResolvedMembershipIsHandedBackToTheCaller() {
        Membership resolved = new Membership(traveler, itinerary, Role.OWNER);
        AuthorizationGuard guard = new AuthorizationGuard((t, i) -> Optional.of(resolved));

        assertThat(guard.requireMember(traveler, itinerary)).isSameAs(resolved);
    }

    @Test
    void noStandingIsRejectedAsNotFound() {
        AuthorizationGuard guard = new AuthorizationGuard((t, i) -> Optional.empty());

        assertThatThrownBy(() -> guard.requireMember(traveler, itinerary))
                .isInstanceOf(ItineraryNotFoundException.class)
                .satisfies(e -> assertThat(((ItineraryNotFoundException) e).code()).isEqualTo("ITINERARY_NOT_FOUND"));
    }

    @Test
    void theRejectionIsIdenticalWhateverTheReasonForIt() {
        AuthorizationGuard guard = new AuthorizationGuard((t, i) -> Optional.empty());

        ItineraryNotFoundException nonexistent =
                catchGuardRejection(guard, traveler, UuidV7.generate());
        ItineraryNotFoundException someoneElses = catchGuardRejection(guard, traveler, itinerary);

        assertThat(nonexistent.code()).isEqualTo(someoneElses.code());
        assertThat(nonexistent.getMessage()).isEqualTo(someoneElses.getMessage());
    }

    @Test
    void theResolversRoleRidesOnTheMembershipTheGuardReturns() {
        AuthorizationGuard guard =
                new AuthorizationGuard((t, i) -> Optional.of(new Membership(t, i, Role.MEMBER)));

        Membership membership = guard.requireMember(traveler, itinerary);

        assertThat(membership.role()).isEqualTo(Role.MEMBER);
        assertThat(membership.isOwner()).isFalse();
    }

    @Test
    void theGuardAsksAboutTheTravelerAndItineraryItWasGiven() {
        UUID[] asked = new UUID[2];
        AuthorizationGuard guard =
                new AuthorizationGuard(
                        (t, i) -> {
                            asked[0] = t;
                            asked[1] = i;
                            return Optional.of(new Membership(t, i, Role.OWNER));
                        });

        guard.requireMember(traveler, itinerary);

        assertThat(asked).containsExactly(traveler, itinerary);
    }

    private static ItineraryNotFoundException catchGuardRejection(
            AuthorizationGuard guard, UUID traveler, UUID itinerary) {
        try {
            guard.requireMember(traveler, itinerary);
            throw new AssertionError("expected the guard to reject");
        } catch (ItineraryNotFoundException expected) {
            return expected;
        }
    }
}
