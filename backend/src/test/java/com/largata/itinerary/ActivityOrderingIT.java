package com.largata.itinerary;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.largata.common.authz.Membership;
import com.largata.common.authz.Role;
import com.largata.support.PostgresTestBase;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;


@SpringBootTest
class ActivityOrderingIT extends PostgresTestBase {

    @Autowired private ItineraryService itineraries;
    @Autowired private DayService days;
    @Autowired private ActivityService activities;
    @Autowired private EditLeaseService editLease;
    @Autowired private JdbcTemplate jdbc;

    @Test
    void aTypedTimeNeverResortsTheDay() {
        Membership member = tripWithOneDay();
        UUID dayId = firstDayId(member.itineraryId());

        ActivityView late = activities.create(member, dayId, timed("Dinner", LocalTime.of(20, 0)));
        ActivityView early = activities.create(member, dayId, timed("Breakfast", LocalTime.of(7, 0)));

        List<UUID> order = orderedIds(dayId);
        assertThat(order)
                .as("manual order is insertion order, not time order")
                .containsExactly(late.id(), early.id());
    }

    @Test
    void reorderPersistsToTheClientGivenOrder() {
        Membership member = tripWithOneDay();
        UUID dayId = firstDayId(member.itineraryId());
        ActivityView a = activities.create(member, dayId, named("A"));
        ActivityView b = activities.create(member, dayId, named("B"));
        ActivityView c = activities.create(member, dayId, named("C"));

        activities.reorder(member, dayId, List.of(a.id(), b.id(), c.id()), List.of(c.id(), a.id(), b.id()));

        assertThat(orderedIds(dayId)).containsExactly(c.id(), a.id(), b.id());
    }

    @Test
    void aReorderMissingAnActivityIsRejected() {
        Membership member = tripWithOneDay();
        UUID dayId = firstDayId(member.itineraryId());
        ActivityView a = activities.create(member, dayId, named("A"));
        ActivityView b = activities.create(member, dayId, named("B"));

        assertThatThrownBy(
                        () -> activities.reorder(member, dayId, List.of(a.id(), b.id()), List.of(a.id())))
                .isInstanceOf(com.largata.common.error.ValidationException.class);
    }

    @Test
    void aReorderListingAForeignActivityIsRejected() {
        Membership member = tripWithOneDay();
        UUID dayId = firstDayId(member.itineraryId());
        ActivityView a = activities.create(member, dayId, named("A"));

        assertThatThrownBy(
                        () ->
                                activities.reorder(
                                        member, dayId, List.of(a.id()), List.of(a.id(), UUID.randomUUID())))
                .isInstanceOf(com.largata.common.error.ValidationException.class);
    }

    @Test
    void aReorderBuiltOnAStaleOrderingIsRefusedRatherThanSilentlyWinning() {
        Membership member = tripWithOneDay();
        UUID dayId = firstDayId(member.itineraryId());
        ActivityView a = activities.create(member, dayId, named("A"));
        ActivityView b = activities.create(member, dayId, named("B"));
        List<UUID> whatTheSlowClientBelieves = List.of(a.id(), b.id());

        activities.reorder(member, dayId, whatTheSlowClientBelieves, List.of(b.id(), a.id()));

        assertThatThrownBy(
                        () ->
                                activities.reorder(
                                        member, dayId, whatTheSlowClientBelieves, List.of(a.id(), b.id())))
                .isInstanceOf(StaleReorderException.class);
        assertThat(orderedIds(dayId))
                .as("the first reorder is not overwritten by the stale one")
                .containsExactly(b.id(), a.id());
    }

    @Test
    void aReorderBuiltOnAStaleSetIsRefused() {
        Membership member = tripWithOneDay();
        UUID dayId = firstDayId(member.itineraryId());
        ActivityView a = activities.create(member, dayId, named("A"));
        List<UUID> whatTheSlowClientBelieves = List.of(a.id());
        ActivityView addedMeanwhile = activities.create(member, dayId, named("B"));

        assertThatThrownBy(
                        () ->
                                activities.reorder(
                                        member,
                                        dayId,
                                        whatTheSlowClientBelieves,
                                        List.of(addedMeanwhile.id(), a.id())))
                .isInstanceOf(StaleReorderException.class);
    }

    @Test
    void crossDayMoveLandsTheActivityAtTheTargetsEnd() {
        Membership member = tripWithOneDay();
        UUID dayA = firstDayId(member.itineraryId());
        DayView dayB = days.appendDay(member, "Day B");
        activities.create(member, dayB.id(), named("Already on B"));
        ActivityView moving = activities.create(member, dayA, named("Moving from A"));
        editLease.acquire(member, LeaseSubject.activity(moving.id()));

        ActivityView moved = activities.move(member, dayA, moving.id(), dayB.id());

        assertThat(orderedIds(dayA)).as("gone from the source day").isEmpty();
        assertThat(orderedIds(dayB.id())).as("landed last on the target day").endsWith(moved.id());
        assertThat(jdbc.queryForObject("SELECT day_id FROM activity WHERE id = ?", UUID.class, moving.id()))
                .isEqualTo(dayB.id());
    }

    @Test
    void deletingADayLeavesTheOtherDaysActivityOrderIntact() {
        Membership member = tripWithOneDay();
        UUID day1 = firstDayId(member.itineraryId());
        DayView day2 = days.appendDay(member, "Day 2");
        ActivityView x = activities.create(member, day2.id(), named("X"));
        ActivityView y = activities.create(member, day2.id(), named("Y"));
        editLease.acquire(member, LeaseSubject.day(day1));

        days.deleteDay(member, day1);

        UUID renumberedDay2 =
                jdbc.queryForObject(
                        "SELECT id FROM day WHERE itinerary_id = ? AND ordinal = 1",
                        UUID.class,
                        member.itineraryId());
        assertThat(renumberedDay2).isEqualTo(day2.id());
        assertThat(orderedIds(day2.id()))
                .as("the surviving day's activity order is undisturbed by the day renumber")
                .containsExactly(x.id(), y.id());
    }


    private static ActivityFields named(String title) {
        return ActivityFields.withoutBooking(title, null, null, null, null, null, null, null);
    }

    private static ActivityFields timed(String title, LocalTime time) {
        return ActivityFields.withoutBooking(title, time, null, null, null, null, null, null);
    }

    private Membership tripWithOneDay() {
        UUID owner = UUID.randomUUID();
        Itinerary trip = itineraries.create(owner, "Palawan", List.of("Palawan"), null, null, null, 1);
        return new Membership(owner, trip.id(), Role.OWNER);
    }

    private UUID firstDayId(UUID itineraryId) {
        return jdbc.queryForObject(
                "SELECT id FROM day WHERE itinerary_id = ? AND ordinal = 1", UUID.class, itineraryId);
    }


    private List<UUID> orderedIds(UUID dayId) {
        return jdbc.queryForList(
                "SELECT id FROM activity WHERE day_id = ? ORDER BY sort_order, id", UUID.class, dayId);
    }
}
