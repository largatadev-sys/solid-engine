package com.largata.itinerary;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.largata.common.authz.Membership;
import com.largata.common.authz.Role;
import com.largata.support.PostgresTestBase;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;


@SpringBootTest
class DayStorageIT extends PostgresTestBase {

    @Autowired private ItineraryService itineraries;
    @Autowired private DayService days;
    @Autowired private EditLeaseService editLease;
    @Autowired private JdbcTemplate jdbc;

    @Test
    void creatingWithADurationMintsThatManyContiguousDays() {
        Itinerary trip = itineraries.create(UUID.randomUUID(), "El Nido", List.of("Palawan"), null, null, null, 5);

        assertThat(ordinalsOf(trip.id()))
                .as("durationDays: 5 mints ordinals 1..5, contiguous")
                .containsExactly(1, 2, 3, 4, 5);
    }

    @Test
    void creatingWithoutADurationIsAValidZeroDayPlan() {
        Itinerary trip = itineraries.create(UUID.randomUUID(), "Japan, someday", List.of("Japan"), null, null, null, 0);

        assertThat(ordinalsOf(trip.id())).as("no duration → no days, and that is legitimate").isEmpty();
    }

    @Test
    void appendingTakesTheNextOrdinal() {
        Membership member = ownerOf(itineraries.create(UUID.randomUUID(), "Cebu", List.of("Cebu"), null, null, null, 2));

        days.appendDay(member, "Arrival");

        assertThat(ordinalsOf(member.itineraryId())).containsExactly(1, 2, 3);
    }


    @Test
    void deletingADayRenumbersTheRestToStayContiguous() {
        Itinerary trip = itineraries.create(UUID.randomUUID(), "Palawan", List.of("Palawan"), null, null, null, 5);
        Membership member = ownerOf(trip);
        UUID thirdDay = dayIdAtOrdinal(trip.id(), 3);
        editLease.acquire(member, LeaseSubject.day(thirdDay));

        days.deleteDay(member, thirdDay);

        assertThat(ordinalsOf(trip.id()))
                .as("the hole at 3 closes; the rest slide down")
                .containsExactly(1, 2, 3, 4);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM day WHERE itinerary_id = ?", Integer.class, trip.id()))
                .isEqualTo(4);
    }


    @Test
    void twoDaysCannotShareAnOrdinal() {
        Itinerary trip = itineraries.create(UUID.randomUUID(), "Bohol", List.of("Bohol"), null, null, null, 1);

        assertThatThrownBy(
                        () ->
                                jdbc.update(
                                        "INSERT INTO day (id, itinerary_id, ordinal, created_at) VALUES (?, ?, 1, ?)",
                                        UUID.randomUUID(),
                                        trip.id(),
                                        Timestamp.from(Instant.now())))
                .as("UNIQUE (itinerary_id, ordinal) refuses a second Day 1")
                .isInstanceOf(org.springframework.dao.DuplicateKeyException.class);
    }

    @Test
    void flywayRanTheDaysMigration() {
        Integer applied =
                jdbc.queryForObject(
                        "SELECT count(*) FROM flyway_schema_history WHERE version = '7' AND success = true",
                        Integer.class);

        assertThat(applied).isEqualTo(1);
    }

    private List<Integer> ordinalsOf(UUID itineraryId) {
        return jdbc.queryForList(
                "SELECT ordinal FROM day WHERE itinerary_id = ? ORDER BY ordinal", Integer.class, itineraryId);
    }

    private UUID dayIdAtOrdinal(UUID itineraryId, int ordinal) {
        return jdbc.queryForObject(
                "SELECT id FROM day WHERE itinerary_id = ? AND ordinal = ?", UUID.class, itineraryId, ordinal);
    }


    private Membership ownerOf(Itinerary itinerary) {
        return new Membership(itinerary.ownerId(), itinerary.id(), Role.OWNER);
    }
}
