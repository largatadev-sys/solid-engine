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

/**
 * The lease's time-dependent behaviour, proven against a clock the test controls (S1.4, ADR-014 —
 * expiry is the real guarantee). The TTL is pinned to a known 3 minutes via a property; the {@link
 * MutableClock} steps past it deterministically, so "did the lease expire" is a fact, not a race.
 *
 * <p>At the service seam rather than over HTTP: expiry and renewal are the service's logic, and a
 * controlled clock is far cleaner to inject here than through the web layer. The HTTP contract (a
 * held lock refuses a stranger, names the holder, guards non-members) is {@code EditLeaseContractIT}.
 *
 * <p>The membership is constructed directly — these tests exercise the lease service in isolation, so
 * they build the {@link Membership} the guard would have produced rather than routing through it.
 * (The lease service never consults the guard; it trusts the membership it is handed, exactly as
 * every other workspace-scoped service does.)
 */
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
        // Bob cannot take a live lease — the whole point of the lock.
        assertThatExceptionOfType(EditLockedException.class).isThrownBy(() -> leases.acquire(bob));

        // Alice's client dies: no release is ever sent. Time passes past the TTL.
        clock.advance(TTL.plusSeconds(1));

        // The lease has freed itself — Bob acquires with no intervention, no cleanup job.
        assertThatCode(() -> leases.acquire(bob)).doesNotThrowAnyException();
    }

    @Test
    void renewalKeepsALiveEditorsLeaseAliveAcrossTtlWindows() {
        Membership alice = ownerOfAFreshTrip();
        Membership bob = otherMemberOf(alice);

        leases.acquire(alice);

        // Two TTL windows pass, but Alice renews inside each — her edit screen is still open.
        clock.advance(TTL.minusSeconds(10));
        leases.renew(alice);
        clock.advance(TTL.minusSeconds(10));
        leases.renew(alice);

        // Across all that elapsed time Bob was never let in: renewal held the lock.
        assertThatExceptionOfType(EditLockedException.class).isThrownBy(() -> leases.acquire(bob));
    }

    @Test
    void requireHeldByRejectsAWriteWhoseLeaseHasSinceExpired() {
        Membership alice = ownerOfAFreshTrip();

        leases.acquire(alice);
        // A held, live lease lets Alice's write through.
        assertThatCode(() -> leases.requireHeldBy(alice)).doesNotThrowAnyException();

        // The lease lapses (Alice stopped renewing); a later write is refused — writing needs a live hold.
        clock.advance(TTL.plusSeconds(1));
        assertThatExceptionOfType(EditLockedException.class).isThrownBy(() -> leases.requireHeldBy(alice));
    }

    @Test
    void renewingALeaseYouNoLongerHoldIsALockConflict() {
        Membership alice = ownerOfAFreshTrip();
        Membership bob = otherMemberOf(alice);

        leases.acquire(alice);
        clock.advance(TTL.plusSeconds(1)); // Alice's lease lapses...
        leases.acquire(bob); // ...and Bob takes over.

        // Alice's stale renew must fail — she is not the holder any more.
        assertThatExceptionOfType(EditLockedException.class).isThrownBy(() -> leases.renew(alice));
    }

    // --- fixtures ---------------------------------------------------------------------------------

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
        /**
         * The single {@link Clock} bean this context has — a {@link MutableClock}, exposed as {@code
         * Clock} so the production {@code @ConditionalOnMissingBean} clock steps aside (the condition
         * matches on the {@code Clock} type). Named {@code editLockTestClock}, not {@code clock}, to
         * avoid colliding with the production bean's name (override is disabled by default). Injected
         * back into the test as a {@link MutableClock} by type.
         */
        @Bean
        @Primary
        MutableClock editLockTestClock() {
            return new MutableClock(Instant.parse("2026-07-24T10:00:00Z"));
        }
    }
}
