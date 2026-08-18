package com.largata.invitation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatExceptionOfType;

import com.largata.common.authz.Membership;
import com.largata.common.authz.Role;
import com.largata.identity.web.VerifiedContact;
import com.largata.itinerary.Itinerary;
import com.largata.itinerary.ItineraryService;
import com.largata.support.MutableClock;
import com.largata.support.PostgresTestBase;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;


@SpringBootTest
@Import(InvitationExpiryIT.ClockConfig.class)
class InvitationExpiryIT extends PostgresTestBase {

    private static final Duration VALIDITY = Invitation.VALIDITY;

    @Autowired private InvitationService invitations;
    @Autowired private MutableClock clock;
    @Autowired private ItineraryService itineraries;

    @Test
    void acceptingAnInvitationThatOutlivedItsValidityIsRefused() {
        Membership owner = ownerOfAFreshTrip();
        String email = freshEmail();
        UUID invitationId = invitations.invite(owner, email).id();
        VerifiedContact invitee = new VerifiedContact(email, true);

        clock.advance(VALIDITY.plusSeconds(1));

        assertThatExceptionOfType(InvitationExceptions.InvitationExpiredException.class)
                .isThrownBy(() -> invitations.accept(invitationId, invitee, UUID.randomUUID()));
    }

    @Test
    void anInvitationStillInsideItsValidityIsAccepted() {
        Membership owner = ownerOfAFreshTrip();
        String email = freshEmail();
        UUID invitationId = invitations.invite(owner, email).id();
        VerifiedContact invitee = new VerifiedContact(email, true);

        clock.advance(VALIDITY.minusSeconds(1));

        assertThatCode(() -> invitations.accept(invitationId, invitee, UUID.randomUUID()))
                .doesNotThrowAnyException();
    }

    @Test
    void theInboxStopsListingAnInvitationOnceItHasExpired() {
        Membership owner = ownerOfAFreshTrip();
        String email = freshEmail();
        invitations.invite(owner, email);
        VerifiedContact invitee = new VerifiedContact(email, true);

        assertThat(invitations.inbox(invitee, UUID.randomUUID())).hasSize(1);

        clock.advance(VALIDITY.plusSeconds(1));

        assertThat(invitations.inbox(invitee, UUID.randomUUID())).isEmpty();
    }

    @Test
    void theOwnersPendingListStopsShowingAnInvitationOnceItHasExpired() {
        Membership owner = ownerOfAFreshTrip();
        invitations.invite(owner, freshEmail());

        assertThat(invitations.pendingInvitations(owner)).hasSize(1);

        clock.advance(VALIDITY.plusSeconds(1));

        assertThat(invitations.pendingInvitations(owner)).isEmpty();
    }

    @Test
    void theSameEmailCanBeInvitedAgainOnceTheFirstInvitationHasExpired() {
        Membership owner = ownerOfAFreshTrip();
        String email = freshEmail();
        invitations.invite(owner, email);

        assertThatExceptionOfType(InvitationExceptions.InvitationAlreadyPendingException.class)
                .isThrownBy(() -> invitations.invite(owner, email));

        clock.advance(VALIDITY.plusSeconds(1));

        assertThatCode(() -> invitations.invite(owner, email)).doesNotThrowAnyException();
    }


    private Membership ownerOfAFreshTrip() {
        UUID ownerId = UUID.randomUUID();
        Itinerary trip = itineraries.create(ownerId, "Trip", "Palawan", null, null);
        return new Membership(ownerId, trip.id(), Role.OWNER);
    }

    private String freshEmail() {
        return "invitee-" + UUID.randomUUID() + "@example.com";
    }

    @TestConfiguration
    static class ClockConfig {

        @Bean
        @Primary
        MutableClock invitationExpiryTestClock() {
            return new MutableClock(Instant.parse("2026-07-29T10:00:00Z"));
        }
    }
}
