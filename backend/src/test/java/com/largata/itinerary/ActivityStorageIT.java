package com.largata.itinerary;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.largata.common.authz.Membership;
import com.largata.common.authz.Role;
import com.largata.support.PostgresTestBase;
import java.math.BigDecimal;
import java.time.LocalTime;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * Ticket 02's storage-level ACs: an activity's fields round-trip, cost carries the null/0 distinction,
 * create appends at end-of-day, and the day-scoping masks (spec AC 7-adjacent, §fields).
 *
 * <p>Drives {@link ActivityService} and {@link DayService} directly with a synthesized {@link
 * Membership} — the storage-level counterpart to {@link DayStorageIT}. The wire, the guard's masking,
 * and the two-account LWW live in {@code ActivityContractIT}.
 */
@SpringBootTest
class ActivityStorageIT extends PostgresTestBase {

    @Autowired private ItineraryService itineraries;
    @Autowired private DayService days;
    @Autowired private ActivityService activities;
    @Autowired private JdbcTemplate jdbc;

    @Test
    void createStampsAttributionAndRoundTripsEveryField() {
        Membership member = tripWithOneDay();
        UUID dayId = firstDayId(member.itineraryId());

        ActivityView created =
                activities.create(
                        member,
                        dayId,
                        new ActivityFields(
                                "Airport Transfer",
                                LocalTime.of(14, 0),
                                new BigDecimal("500.00"),
                                "PHP",
                                "Lio Airport",
                                "Van transfer to the hotel.",
                                "Book the 8am slot.",
                                "https://klook.com/x"));

        assertThat(created.title()).isEqualTo("Airport Transfer");
        assertThat(created.timeOfDay()).isEqualTo(LocalTime.of(14, 0));
        assertThat(created.costAmount()).isEqualByComparingTo("500.00");
        assertThat(created.costCurrency()).isEqualTo("PHP");
        assertThat(created.place()).isEqualTo("Lio Airport");
        assertThat(created.notes()).isEqualTo("Book the 8am slot.");
        assertThat(created.externalUrl()).isEqualTo("https://klook.com/x");
        // Attribution is stamped on create — an activity is never un-attributed (spec Q7).
        assertThat(created.lastEditedBy()).isEqualTo(member.travelerId());
        assertThat(created.lastEditedAt()).isNotNull();
    }

    @Test
    void zeroCostAndUnstatedCostAreDifferentFacts() {
        Membership member = tripWithOneDay();
        UUID dayId = firstDayId(member.itineraryId());

        // Free: amount zero, currency present — a real, stated fact.
        ActivityView free =
                activities.create(
                        member, dayId, fields("Sunset walk", BigDecimal.ZERO, "PHP"));
        // Unstated: both null — the traveler said nothing about cost.
        ActivityView unstated = activities.create(member, dayId, fields("Wander", null, null));

        assertThat(free.costAmount()).isEqualByComparingTo("0");
        assertThat(free.costCurrency()).isEqualTo("PHP");
        assertThat(unstated.costAmount()).as("unstated is null, not zero").isNull();
        assertThat(unstated.costCurrency()).isNull();
    }

    /**
     * A cap a real client can hit answers 400, not 500 (whole-branch review). Ticket 03 reasoned this
     * out for the reorder while tickets 01/02 left their caps throwing a raw {@code
     * IllegalArgumentException} — which the global handler turns into an ERROR-logged 500, paging an
     * operator for "that is as many activities as a day can hold".
     */
    @Test
    void exceedingTheActivityCapIsAValidationFailureNotAServerError() {
        Membership member = tripWithOneDay();
        UUID dayId = firstDayId(member.itineraryId());
        for (int i = 0; i < ActivityService.MAX_ACTIVITIES_PER_DAY; i++) {
            activities.create(member, dayId, fields("Filler " + i, null, null));
        }

        assertThatThrownBy(() -> activities.create(member, dayId, fields("One too many", null, null)))
                .isInstanceOf(com.largata.common.error.ValidationException.class);
    }

    @Test
    void anAmountWithoutACurrencyIsRefused() {
        assertThatThrownBy(() -> new ActivityFields("x", null, new BigDecimal("10"), null, null, null, null, null))
                .as("amount and currency travel together")
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void aNegativeCostIsRefused() {
        assertThatThrownBy(() -> new ActivityFields("x", null, new BigDecimal("-1"), "PHP", null, null, null, null))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void createAppendsAtEndOfDay() {
        Membership member = tripWithOneDay();
        UUID dayId = firstDayId(member.itineraryId());

        ActivityView first = activities.create(member, dayId, fields("First", null, null));
        ActivityView second = activities.create(member, dayId, fields("Second", null, null));
        ActivityView third = activities.create(member, dayId, fields("Third", null, null));

        // End-of-day sort: each appends after the last, so order is insertion order until ticket 03
        // reorders. Values start at 0 and climb.
        assertThat(first.sortOrder()).isLessThan(second.sortOrder());
        assertThat(second.sortOrder()).isLessThan(third.sortOrder());
    }

    @Test
    void editReplacesFieldsAndRestampsAttribution() {
        Membership member = tripWithOneDay();
        UUID dayId = firstDayId(member.itineraryId());
        ActivityView created = activities.create(member, dayId, fields("Draft", null, null));

        ActivityView edited =
                activities.edit(
                        member,
                        dayId,
                        created.id(),
                        new ActivityFields("Final", LocalTime.of(9, 30), null, null, "Beach", null, null, null));

        assertThat(edited.id()).as("same activity, edited in place").isEqualTo(created.id());
        assertThat(edited.title()).isEqualTo("Final");
        assertThat(edited.timeOfDay()).isEqualTo(LocalTime.of(9, 30));
        assertThat(edited.place()).isEqualTo("Beach");
    }

    @Test
    void deleteRemovesTheActivity() {
        Membership member = tripWithOneDay();
        UUID dayId = firstDayId(member.itineraryId());
        ActivityView created = activities.create(member, dayId, fields("Doomed", null, null));

        activities.delete(member, dayId, created.id());

        assertThat(jdbc.queryForObject("SELECT count(*) FROM activity WHERE id = ?", Integer.class, created.id()))
                .isEqualTo(0);
    }

    @Test
    void anActivityOfAnotherDayIsNotFound() {
        Membership member = tripWithOneDay();
        UUID dayA = firstDayId(member.itineraryId());
        DayView dayB = days.appendDay(member, "Day B");
        ActivityView onB = activities.create(member, dayB.id(), fields("On B", null, null));

        // Addressing B's activity under day A is a masking 404 — same shape as the guard's.
        assertThatThrownBy(() -> activities.edit(member, dayA, onB.id(), fields("x", null, null)))
                .isInstanceOf(ActivityNotFoundException.class);
    }

    @Test
    void deletingADayCascadesItsActivities() {
        Membership member = tripWithOneDay();
        UUID dayId = firstDayId(member.itineraryId());
        activities.create(member, dayId, fields("Gone with the day", null, null));

        days.deleteDay(member, dayId);

        assertThat(jdbc.queryForObject("SELECT count(*) FROM activity WHERE day_id = ?", Integer.class, dayId))
                .as("V7's ON DELETE CASCADE takes the activities with the day")
                .isEqualTo(0);
    }

    private static ActivityFields fields(String title, BigDecimal amount, String currency) {
        return new ActivityFields(title, null, amount, currency, null, null, null, null);
    }

    private Membership tripWithOneDay() {
        UUID owner = UUID.randomUUID();
        Itinerary trip = itineraries.create(owner, "Palawan", java.util.List.of("Palawan"), null, null, null, 1);
        return new Membership(owner, trip.id(), Role.OWNER);
    }

    private UUID firstDayId(UUID itineraryId) {
        return jdbc.queryForObject(
                "SELECT id FROM day WHERE itinerary_id = ? AND ordinal = 1", UUID.class, itineraryId);
    }
}
