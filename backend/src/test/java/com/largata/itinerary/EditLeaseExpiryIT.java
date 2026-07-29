package com.largata.itinerary;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatExceptionOfType;

import com.largata.common.authz.Membership;
import com.largata.common.authz.Role;
import com.largata.support.MutableClock;
import com.largata.support.PostgresTestBase;
import java.time.Clock;
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
import org.springframework.test.context.TestPropertySource;


@SpringBootTest
@Import(EditLeaseExpiryIT.ClockConfig.class)
@TestPropertySource(properties = "largata.edit-lock.ttl=PT3M")
class EditLeaseExpiryIT extends PostgresTestBase {

    private static final Duration TTL = Duration.ofMinutes(3);

    @Autowired private EditLeaseService leases;
    @Autowired private MutableClock clock;
    @Autowired private ItineraryService itineraries;

    @Test
    void anAbandonedLeaseFreesItselfWhenTheTtlLapses() {
        Membership alice = ownerOfAFreshTrip();
        Membership bob = otherMemberOf(alice);

        leases.acquire(alice);
        assertThatExceptionOfType(EditLockedException.class).isThrownBy(() -> leases.acquire(bob));

        clock.advance(TTL.plusSeconds(1));

        assertThatCode(() -> leases.acquire(bob)).doesNotThrowAnyException();
    }

    @Test
    void renewalKeepsALiveEditorsLeaseAliveAcrossTtlWindows() {
        Membership alice = ownerOfAFreshTrip();
        Membership bob = otherMemberOf(alice);

        leases.acquire(alice);

        clock.advance(TTL.minusSeconds(10));
        leases.renew(alice);
        clock.advance(TTL.minusSeconds(10));
        leases.renew(alice);

        assertThatExceptionOfType(EditLockedException.class).isThrownBy(() -> leases.acquire(bob));
    }

    @Test
    void requireHeldByRejectsAWriteWhoseLeaseHasSinceExpired() {
        Membership alice = ownerOfAFreshTrip();

        leases.acquire(alice);
        assertThatCode(() -> leases.requireHeldBy(alice)).doesNotThrowAnyException();

        clock.advance(TTL.plusSeconds(1));
        assertThatExceptionOfType(EditLockedException.class).isThrownBy(() -> leases.requireHeldBy(alice));
    }

    @Test
    void renewingALeaseYouNoLongerHoldIsALockConflict() {
        Membership alice = ownerOfAFreshTrip();
        Membership bob = otherMemberOf(alice);

        leases.acquire(alice);
        clock.advance(TTL.plusSeconds(1));
        leases.acquire(bob);

        assertThatExceptionOfType(EditLockedException.class).isThrownBy(() -> leases.renew(alice));
    }


    private Membership ownerOfAFreshTrip() {
        UUID ownerId = UUID.randomUUID();
        Itinerary trip = itineraries.create(ownerId, "Trip", List.of("Palawan"), null, null);
        return new Membership(ownerId, trip.id(), Role.OWNER);
    }

    private Membership otherMemberOf(Membership owner) {
        return new Membership(UUID.randomUUID(), owner.itineraryId(), Role.MEMBER);
    }

    @TestConfiguration
    static class ClockConfig {

        @Bean
        @Primary
        MutableClock editLockTestClock() {
            return new MutableClock(Instant.parse("2026-07-24T10:00:00Z"));
        }
    }
}
