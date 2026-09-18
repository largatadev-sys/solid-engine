package com.largata.trip.editing;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatExceptionOfType;

import com.largata.support.Proofs;
import com.largata.trip.api.Membership;
import com.largata.trip.api.TripFence;
import com.largata.trip.api.Role;
import com.largata.support.MutableClock;
import com.largata.support.PostgresTestBase;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.TestPropertySource;
import com.largata.trip.trip.entity.Trip;
import com.largata.trip.plan.UnbookedActivity;
import com.largata.trip.plan.entity.ActivityFields;
import com.largata.trip.editing.entity.LeaseSubject;
import com.largata.trip.editing.exception.EditLockedException;
import com.largata.trip.editing.service.EditLeaseService;
import com.largata.trip.trip.service.TripService;
import com.largata.trip.plan.service.ActivityService;
import com.largata.trip.plan.service.ActivityView;


@SpringBootTest
@Import(EditLeaseExpiryIT.ClockConfig.class)
@TestPropertySource(properties = "largata.edit-lock.ttl=PT3M")
class EditLeaseExpiryIT extends PostgresTestBase {

    private static final Duration TTL = Duration.ofMinutes(3);

    @Autowired private EditLeaseService leases;
    @Autowired private TripFence fence;
    @Autowired private MutableClock clock;
    @Autowired private TripService itineraries;
    @Autowired private ActivityService activities;
    @Autowired private JdbcTemplate jdbc;

    @Test
    void anAbandonedLeaseFreesItselfWhenTheTtlLapses() {
        Membership alice = ownerOfAFreshTrip();
        Membership bob = otherMemberOf(alice);
        LeaseSubject header = LeaseSubject.header(alice.itineraryId());

        leases.acquire(editable(alice), header);
        assertThatExceptionOfType(EditLockedException.class).isThrownBy(() -> leases.acquire(editable(bob), header));

        clock.advance(TTL.plusSeconds(1));

        assertThatCode(() -> leases.acquire(editable(bob), header)).doesNotThrowAnyException();
    }

    @Test
    void renewalKeepsALiveEditorsLeaseAliveAcrossTtlWindows() {
        Membership alice = ownerOfAFreshTrip();
        Membership bob = otherMemberOf(alice);
        LeaseSubject header = LeaseSubject.header(alice.itineraryId());

        leases.acquire(editable(alice), header);

        clock.advance(TTL.minusSeconds(10));
        leases.renew(editable(alice), header);
        clock.advance(TTL.minusSeconds(10));
        leases.renew(editable(alice), header);

        assertThatExceptionOfType(EditLockedException.class).isThrownBy(() -> leases.acquire(editable(bob), header));
    }

    @Test
    void requireHeldByRejectsAWriteWhoseLeaseHasSinceExpired() {
        Membership alice = ownerOfAFreshTrip();
        LeaseSubject header = LeaseSubject.header(alice.itineraryId());

        leases.acquire(editable(alice), header);
        assertThatCode(() -> leases.requireHeldBy(editable(alice), header)).doesNotThrowAnyException();

        clock.advance(TTL.plusSeconds(1));
        assertThatExceptionOfType(EditLockedException.class)
                .isThrownBy(() -> leases.requireHeldBy(editable(alice), header));
    }

    @Test
    void renewingALeaseYouNoLongerHoldIsALockConflict() {
        Membership alice = ownerOfAFreshTrip();
        Membership bob = otherMemberOf(alice);
        LeaseSubject header = LeaseSubject.header(alice.itineraryId());

        leases.acquire(editable(alice), header);
        clock.advance(TTL.plusSeconds(1));
        leases.acquire(editable(bob), header);

        assertThatExceptionOfType(EditLockedException.class).isThrownBy(() -> leases.renew(editable(alice), header));
    }

    @Test
    void aLeaseOnOneActivitySaysNothingAboutTheActivityBesideIt() {
        Membership alice = ownerOfAPlannedTrip();
        Membership bob = otherMemberOf(alice);
        UUID dayId = firstDayId(alice.itineraryId());
        ActivityView hers = activities.create(editable(alice), dayId, named("Sunset cruise"));
        ActivityView his = activities.create(editable(alice), dayId, named("Dive shop"));

        leases.acquire(editable(alice), LeaseSubject.activity(hers.id()));

        assertThatCode(() -> leases.acquire(editable(bob), LeaseSubject.activity(his.id())))
                .as("the whole point of the subject-typed lease: two editors, one day")
                .doesNotThrowAnyException();
        assertThatExceptionOfType(EditLockedException.class)
                .isThrownBy(() -> leases.acquire(editable(bob), LeaseSubject.activity(hers.id())));
    }

    @Test
    void aLeaseOnADayDoesNotImplyTheActivitiesInsideIt() {
        Membership alice = ownerOfAPlannedTrip();
        Membership bob = otherMemberOf(alice);
        UUID dayId = firstDayId(alice.itineraryId());
        ActivityView inside = activities.create(editable(alice), dayId, named("Inside the day"));

        leases.acquire(editable(alice), LeaseSubject.day(dayId));

        assertThatCode(() -> leases.acquire(editable(bob), LeaseSubject.activity(inside.id())))
                .as("ADR-014 amended: the day lease guards the day's own fields, never its contents")
                .doesNotThrowAnyException();
    }

    @Test
    void everySubjectIsStoredUnderTheEnumsOwnUppercaseSpelling() {
        Membership alice = ownerOfAPlannedTrip();
        UUID dayId = firstDayId(alice.itineraryId());
        ActivityView activity = activities.create(editable(alice), dayId, named("Anything"));

        leases.acquire(editable(alice), LeaseSubject.header(alice.itineraryId()));
        leases.acquire(editable(alice), LeaseSubject.day(dayId));
        leases.acquire(editable(alice), LeaseSubject.activity(activity.id()));

        assertThat(
                        jdbc.queryForList(
                                "SELECT subject_type FROM edit_lease WHERE itinerary_id = ? ORDER BY subject_type",
                                String.class,
                                alice.itineraryId()))
                .as("@Enumerated(STRING) writes the NAME — any SQL naming these values must use it")
                .containsExactly("ACTIVITY", "DAY", "HEADER");
    }

    private static ActivityFields named(String title) {
        return UnbookedActivity.fields(title, null, null, null, null, null, null, null);
    }

    private Membership ownerOfAFreshTrip() {
        UUID ownerId = UUID.randomUUID();
        Trip trip = itineraries.create(ownerId, "Trip", "Palawan", null, null);
        return new Membership(ownerId, trip.id(), Role.OWNER);
    }

    private Membership ownerOfAPlannedTrip() {
        UUID ownerId = UUID.randomUUID();
        Trip trip = itineraries.create(ownerId, "Trip", "Palawan", null, null, null, 1);
        return new Membership(ownerId, trip.id(), Role.OWNER);
    }

    private Membership otherMemberOf(Membership owner) {
        return new Membership(UUID.randomUUID(), owner.itineraryId(), Role.MEMBER);
    }

    private UUID firstDayId(UUID itineraryId) {
        return jdbc.queryForObject(
                "SELECT id FROM day WHERE itinerary_id = ? AND ordinal = 1", UUID.class, itineraryId);
    }

    @TestConfiguration
    static class ClockConfig {

        @Bean
        @Primary
        MutableClock editLockTestClock() {
            return new MutableClock(Instant.parse("2026-07-24T10:00:00Z"));
        }
    }

    private Proofs proofs() {
        return new Proofs(fence);
    }

    private TripFence.Editable<Membership> editable(Membership member) {
        return proofs().editable(member);
    }
}
