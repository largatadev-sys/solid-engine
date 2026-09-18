package com.largata.trip.editing;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatExceptionOfType;

import com.largata.support.Proofs;
import com.largata.trip.api.Membership;
import com.largata.trip.api.Owner;
import com.largata.trip.api.TripFence;
import com.largata.trip.api.Role;
import com.largata.support.MutableClock;
import com.largata.support.PostgresTestBase;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import com.largata.identity.TravelerClaims;
import com.largata.identity.TravelerService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.test.context.TestPropertySource;
import com.largata.trip.trip.entity.Trip;
import com.largata.trip.editing.entity.LeaseSubject;
import com.largata.trip.editing.exception.EditLockedException;
import com.largata.trip.trip.service.TripService;
import com.largata.trip.editing.service.EditLeaseService;


@SpringBootTest
@Import(LifecycleRespectsEditingSessionIT.ClockConfig.class)
@TestPropertySource(properties = "largata.edit-lock.ttl=PT3M")
class LifecycleRespectsEditingSessionIT extends PostgresTestBase {

    private static final Duration TTL = Duration.ofMinutes(3);

    @Autowired private TripService itineraries;
    @Autowired private TripFence fence;
    @Autowired private TravelerService travelers;
    @Autowired private EditLeaseService leases;
    @Autowired private MutableClock clock;


    @FunctionalInterface
    interface LifecycleAct {
        void run(TripService service, Proofs proofs, Membership owner);
    }


    static Stream<Arguments> everyLifecycleAct() {
        return Stream.of(
                Arguments.of(
                        "start",
                        (LifecycleAct) (service, proofs, owner) -> service.start(proofs.editableOwner(owner)),
                        0),
                Arguments.of(
                        "complete",
                        (LifecycleAct) (service, proofs, owner) -> service.complete(proofs.editableOwner(owner)),
                        1),
                Arguments.of(
                        "reopen",
                        (LifecycleAct) (service, proofs, owner) -> service.reopen(proofs.writableOwner(owner)),
                        1));
    }


    @ParameterizedTest(name = "{0} refuses while another traveler holds the editing session")
    @MethodSource("everyLifecycleAct")
    void aLifecycleActRefusesWhileAnotherTravelerIsEditing(
            String name, LifecycleAct act, int rungsToClimb) {
        Membership owner = ownerAtRung(rungsToClimb);
        Membership member = otherMemberOf(owner);

        leases.acquire(editable(member), LeaseSubject.session(owner.itineraryId()));

        assertThatExceptionOfType(EditLockedException.class)
                .isThrownBy(() -> act.run(itineraries, proofs(), owner));
    }


    @ParameterizedTest(name = "{0} still runs for the traveler who holds the session")
    @MethodSource("everyLifecycleAct")
    void theSessionHolderIsNotBlockedByTheirOwnLease(
            String name, LifecycleAct act, int rungsToClimb) {
        Membership owner = ownerAtRung(rungsToClimb);

        leases.acquire(editable(owner), LeaseSubject.session(owner.itineraryId()));

        assertThatCode(() -> act.run(itineraries, proofs(), owner)).doesNotThrowAnyException();
    }


    @ParameterizedTest(name = "{0} runs once an abandoned session has lapsed")
    @MethodSource("everyLifecycleAct")
    void anExpiredSessionStopsBlockingTheLadder(String name, LifecycleAct act, int rungsToClimb) {
        Membership owner = ownerAtRung(rungsToClimb);
        Membership member = otherMemberOf(owner);

        leases.acquire(editable(member), LeaseSubject.session(owner.itineraryId()));
        clock.advance(TTL.plusSeconds(1));

        assertThatCode(() -> act.run(itineraries, proofs(), owner)).doesNotThrowAnyException();
    }


    @Test
    void anUnheldTripStartsExactlyAsBefore() {
        Membership owner = ownerAtRung(0);

        assertThatCode(() -> itineraries.start(editableOwner(owner))).doesNotThrowAnyException();
    }




    private Membership ownerAtRung(int rungs) {
        UUID ownerId = provisionedTraveler();
        Trip trip = itineraries.create(ownerId, "Trip", "Palawan", null, null, null, 1);
        Membership owner = new Membership(ownerId, trip.id(), Role.OWNER);

        if (rungs >= 1) itineraries.start(editableOwner(owner));
        if (rungs >= 2) itineraries.complete(editableOwner(owner));
        return owner;
    }


    private UUID provisionedTraveler() {
        String uid = "uid-" + UUID.randomUUID();
        return travelers.getOrProvision(TravelerClaims.of(uid, uid + "@example.com", null)).id();
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

    private Proofs proofs() {
        return new Proofs(fence);
    }

    private TripFence.Editable<Membership> editable(Membership member) {
        return proofs().editable(member);
    }

    private TripFence.Editable<Owner> editableOwner(Membership member) {
        return proofs().editableOwner(member);
    }
}
