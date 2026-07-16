package com.largata.common.authz;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.largata.common.id.UuidV7;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/**
 * Ticket 02's ACs at the unit seam: the guard's behaviour against a stubbed resolver, no database
 * and no Spring.
 *
 * <p>This is the Full-rigor zone (CLAUDE.md), and these tests are why the resolver seam earns its
 * keep beyond the E1 swap: the guard's decision table — resolve, reject, carry the role — is
 * provable in milliseconds against a stub. The integration proof that the whole chain honours it
 * lives in {@code ItineraryContractIT}; both exist, deliberately.
 */
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
        // The masking rule (Artifact 03), asserted at the level where it is decided. The resolver
        // reports "no standing" for both "no such itinerary" and "exists, not yours" — the guard
        // cannot tell them apart, which is precisely the guarantee: there is no branch here that a
        // later change could accidentally make informative.
        AuthorizationGuard guard = new AuthorizationGuard((t, i) -> Optional.empty());

        ItineraryNotFoundException nonexistent =
                catchGuardRejection(guard, traveler, UuidV7.generate());
        ItineraryNotFoundException someoneElses = catchGuardRejection(guard, traveler, itinerary);

        assertThat(nonexistent.code()).isEqualTo(someoneElses.code());
        assertThat(nonexistent.getMessage()).isEqualTo(someoneElses.getMessage());
    }

    @Test
    void theResolversRoleRidesOnTheMembershipTheGuardReturns() {
        // Role-gated operations check the role on the object the guard produced (Artifact 03) —
        // so the guard must carry it faithfully rather than assume OWNER, which is all S0.3's
        // resolver can currently produce. When E1's resolver starts returning MEMBER, this passes
        // unchanged; that is the seam working.
        AuthorizationGuard guard =
                new AuthorizationGuard((t, i) -> Optional.of(new Membership(t, i, Role.MEMBER)));

        Membership membership = guard.requireMember(traveler, itinerary);

        assertThat(membership.role()).isEqualTo(Role.MEMBER);
        assertThat(membership.isOwner()).isFalse();
    }

    @Test
    void theGuardAsksAboutTheTravelerAndItineraryItWasGiven() {
        // Guards against the silent catastrophe: a resolver call built from the wrong variables
        // would still return *a* membership, and every test above would pass while the guard
        // authorized the wrong person.
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
