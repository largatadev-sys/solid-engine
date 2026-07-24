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

/**
 * Ticket 01's storage-level ACs: day ordinals are contiguous, the contiguity is structural (V7's
 * UNIQUE), and delete renumbers the survivors (spec AC 1/2, ADR-013).
 *
 * <p>Drives {@link DayService} directly with a synthesized {@link Membership} — the guard's capability
 * is a public record, so a test can mint one without going through HTTP. That is deliberate: this
 * class is about what the database holds after each operation, not about the wire, so it works one
 * layer below the controller. The wire and the guard's masking live in {@link DayContractIT}.
 */
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
        // The pre-S1.3 shape, and the create-without-duration shape: zero days is a plan, not an error.
        Itinerary trip = itineraries.create(UUID.randomUUID(), "Japan, someday", List.of("Japan"), null, null, null, 0);

        assertThat(ordinalsOf(trip.id())).as("no duration → no days, and that is legitimate").isEmpty();
    }

    @Test
    void appendingTakesTheNextOrdinal() {
        Membership member = ownerOf(itineraries.create(UUID.randomUUID(), "Cebu", List.of("Cebu"), null, null, null, 2));

        days.appendDay(member, "Arrival");

        assertThat(ordinalsOf(member.itineraryId())).containsExactly(1, 2, 3);
    }

    /**
     * The headline of this class: deleting a day in the middle renumbers the rest, so 1,2,~~3~~,4,5
     * becomes 1,2,3,4 — contiguous, never sparse (ADR-013). A sparse plan would make "Day 4" ambiguous
     * to every screen that counts.
     */
    @Test
    void deletingADayRenumbersTheRestToStayContiguous() {
        Itinerary trip = itineraries.create(UUID.randomUUID(), "Palawan", List.of("Palawan"), null, null, null, 5);
        Membership member = ownerOf(trip);
        UUID thirdDay = dayIdAtOrdinal(trip.id(), 3);

        days.deleteDay(member, thirdDay);

        assertThat(ordinalsOf(trip.id()))
                .as("the hole at 3 closes; the rest slide down")
                .containsExactly(1, 2, 3, 4);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM day WHERE itinerary_id = ?", Integer.class, trip.id()))
                .isEqualTo(4);
    }

    /**
     * Contiguity is structural, not merely maintained: V7's {@code UNIQUE (itinerary_id, ordinal)}
     * refuses a duplicate ordinal, so a renumber bug fails loudly at the database rather than planting
     * two Day-3s that every later query would have to disambiguate — the S1.1 partial-index discipline
     * applied to ordinals.
     */
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
        // The S0.1 lesson, per migration: only the history proves the pipeline built the schema, not a
        // hand-created table. Every other test here would pass against one.
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

    /**
     * The owner's membership, as the guard would mint it — every day op takes one (spec Q8: any member).
     * Takes the edit lease too (S1.4, ADR-014): day writes now require it, and this fixture's tests
     * write as a single member, so acquiring here means every {@code appendDay}/{@code deleteDay} holds
     * the lock.
     */
    private Membership ownerOf(Itinerary itinerary) {
        Membership member = new Membership(itinerary.ownerId(), itinerary.id(), Role.OWNER);
        editLease.acquire(member);
        return member;
    }
}
