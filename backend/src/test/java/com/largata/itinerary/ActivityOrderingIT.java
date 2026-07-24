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

/**
 * Ticket 03's storage-level ACs: manual order is authoritative (a typed time never resorts), reorder
 * persists to a client-given order, a cross-day move lands at the target's end, and a day delete
 * leaves the other days' order intact (spec AC 3, and the interaction with ticket 01's renumber).
 *
 * <p>Drives {@link ActivityService} / {@link DayService} directly — the storage counterpart to {@code
 * ActivityStorageIT}. The wire, the stale-list 400, and masking live in {@code ActivityContractIT}.
 */
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

        // Created in insertion order, but with times that would sort the other way round if time
        // ordered. Manual order (insertion) must win — the drag handle is the truth, not the clock.
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

        // Drag C to the top: the client sends the whole new order.
        activities.reorder(member, dayId, List.of(c.id(), a.id(), b.id()));

        assertThat(orderedIds(dayId)).containsExactly(c.id(), a.id(), b.id());
    }

    @Test
    void aReorderMissingAnActivityIsRejected() {
        Membership member = tripWithOneDay();
        UUID dayId = firstDayId(member.itineraryId());
        ActivityView a = activities.create(member, dayId, named("A"));
        activities.create(member, dayId, named("B"));

        // A stale list — one activity short. Rejecting is what stops a silent drop (spec AC 3 note).
        // A ValidationException (→ 400), not IllegalArgumentException (→ 500): a stale client is a race.
        assertThatThrownBy(() -> activities.reorder(member, dayId, List.of(a.id())))
                .isInstanceOf(com.largata.common.error.ValidationException.class);
    }

    @Test
    void aReorderListingAForeignActivityIsRejected() {
        Membership member = tripWithOneDay();
        UUID dayId = firstDayId(member.itineraryId());
        ActivityView a = activities.create(member, dayId, named("A"));

        assertThatThrownBy(() -> activities.reorder(member, dayId, List.of(a.id(), UUID.randomUUID())))
                .isInstanceOf(com.largata.common.error.ValidationException.class);
    }

    @Test
    void crossDayMoveLandsTheActivityAtTheTargetsEnd() {
        Membership member = tripWithOneDay();
        UUID dayA = firstDayId(member.itineraryId());
        DayView dayB = days.appendDay(member, "Day B");
        activities.create(member, dayB.id(), named("Already on B"));
        ActivityView moving = activities.create(member, dayA, named("Moving from A"));

        ActivityView moved = activities.move(member, dayA, moving.id(), dayB.id());

        // It left A and joined B at the end (after "Already on B").
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

        // Delete Day 1 — Day 2 renumbers to ordinal 1 (ticket 01), but its activities' order is untouched.
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

    // --- fixtures ---------------------------------------------------------------------------------

    private static ActivityFields named(String title) {
        return new ActivityFields(title, null, null, null, null, null, null, null);
    }

    private static ActivityFields timed(String title, LocalTime time) {
        return new ActivityFields(title, time, null, null, null, null, null, null);
    }

    private Membership tripWithOneDay() {
        UUID owner = UUID.randomUUID();
        Itinerary trip = itineraries.create(owner, "Palawan", List.of("Palawan"), null, null, null, 1);
        Membership member = new Membership(owner, trip.id(), Role.OWNER);
        // S1.4: plan writes require the edit lease (ADR-014). This ordering test writes as one member,
        // so the fixture takes the lock once and every reorder/move holds it.
        editLease.acquire(member);
        return member;
    }

    private UUID firstDayId(UUID itineraryId) {
        return jdbc.queryForObject(
                "SELECT id FROM day WHERE itinerary_id = ? AND ordinal = 1", UUID.class, itineraryId);
    }

    /** The day's activity ids in stored order (sort_order, id tiebreak) — what a plan read would show. */
    private List<UUID> orderedIds(UUID dayId) {
        return jdbc.queryForList(
                "SELECT id FROM activity WHERE day_id = ? ORDER BY sort_order, id", UUID.class, dayId);
    }
}
