package com.largata.itinerary;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatExceptionOfType;

import com.largata.common.authz.Membership;
import com.largata.common.authz.Role;
import com.largata.support.MutableClock;
import com.largata.support.PostgresTestBase;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.test.context.TestPropertySource;


@SpringBootTest
@Import(LifecycleRespectsEditingSessionIT.ClockConfig.class)
@TestPropertySource(properties = "largata.edit-lock.ttl=PT3M")
class LifecycleRespectsEditingSessionIT extends PostgresTestBase {

    private static final Duration TTL = Duration.ofMinutes(3);

    @Autowired private ItineraryService itineraries;
    @Autowired private EditLeaseService leases;
    @Autowired private MutableClock clock;


    @FunctionalInterface
    interface LifecycleAct {
        void run(ItineraryService service, Membership owner);
    }


    static Stream<Arguments> everyLifecycleAct() {
        return Stream.of(
                Arguments.of("start", (LifecycleAct) ItineraryService::start, 0),
                Arguments.of("complete", (LifecycleAct) ItineraryService::complete, 1),
                Arguments.of("reopen", (LifecycleAct) ItineraryService::reopen, 1),
                Arguments.of(
                        "publish",
                        (LifecycleAct) (service, owner) -> service.publish(owner, Visibility.PRIVATE),
                        2));
    }


    @ParameterizedTest(name = "{0} refuses while another traveler holds the editing session")
    @MethodSource("everyLifecycleAct")
    void aLifecycleActRefusesWhileAnotherTravelerIsEditing(
            String name, LifecycleAct act, int rungsToClimb) {
        Membership owner = ownerAtRung(rungsToClimb);
        Membership member = otherMemberOf(owner);

        leases.acquire(member, LeaseSubject.session(owner.itineraryId()));

        assertThatExceptionOfType(EditLockedException.class)
                .isThrownBy(() -> act.run(itineraries, owner));
    }


    @ParameterizedTest(name = "{0} still runs for the traveler who holds the session")
    @MethodSource("everyLifecycleAct")
    void theSessionHolderIsNotBlockedByTheirOwnLease(
            String name, LifecycleAct act, int rungsToClimb) {
        Membership owner = ownerAtRung(rungsToClimb);

        leases.acquire(owner, LeaseSubject.session(owner.itineraryId()));

        assertThatCode(() -> act.run(itineraries, owner)).doesNotThrowAnyException();
    }


    @ParameterizedTest(name = "{0} runs once an abandoned session has lapsed")
    @MethodSource("everyLifecycleAct")
    void anExpiredSessionStopsBlockingTheLadder(String name, LifecycleAct act, int rungsToClimb) {
        Membership owner = ownerAtRung(rungsToClimb);
        Membership member = otherMemberOf(owner);

        leases.acquire(member, LeaseSubject.session(owner.itineraryId()));
        clock.advance(TTL.plusSeconds(1));

        assertThatCode(() -> act.run(itineraries, owner)).doesNotThrowAnyException();
    }


    @Test
    void anUnheldTripStartsExactlyAsBefore() {
        Membership owner = ownerAtRung(0);

        assertThatCode(() -> itineraries.start(owner)).doesNotThrowAnyException();
    }


    @Test
    void theSessionGuardDoesNotSwallowThePublishedRefusal() {
        Membership owner = ownerAtRung(2);
        itineraries.publish(owner, Visibility.PRIVATE);

        assertThatExceptionOfType(IllegalStateTransitionException.class)
                .isThrownBy(() -> itineraries.reopen(owner));
    }


    private Membership ownerAtRung(int rungs) {
        UUID ownerId = UUID.randomUUID();
        Itinerary trip = itineraries.create(ownerId, "Trip", "Palawan", null, null, null, 1);
        Membership owner = new Membership(ownerId, trip.id(), Role.OWNER);

        if (rungs >= 1) itineraries.start(owner);
        if (rungs >= 2) itineraries.complete(owner);
        return owner;
    }


    private Membership otherMemberOf(Membership owner) {
        return new Membership(UUID.randomUUID(), owner.itineraryId(), Role.MEMBER);
    }


    @TestConfiguration
    static class ClockConfig {

        @Bean
        @Primary
        MutableClock lifecycleSessionTestClock() {
            return new MutableClock(Instant.parse("2026-08-09T10:00:00Z"));
        }
    }
}
