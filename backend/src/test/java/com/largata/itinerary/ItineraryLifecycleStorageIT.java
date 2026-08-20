package com.largata.itinerary;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.largata.common.authz.Membership;
import com.largata.common.authz.Role;
import com.largata.support.PostgresTestBase;
import java.lang.reflect.RecordComponent;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;


@SpringBootTest
class ItineraryLifecycleStorageIT extends PostgresTestBase {

    @Autowired private ItineraryService itineraries;
    @Autowired private JdbcTemplate jdbc;


    @Test
    void theStateColumnHoldsTheEnumNameNotTheWireForm() {
        Membership owner = tripOwnedByFreshTraveler();

        assertThat(storedState(owner.itineraryId()))
                .as("S4.26 — a trip is born upcoming, so the storage spelling is pinned from creation")
                .isEqualTo("UPCOMING");
        assertThat(ItineraryState.UPCOMING.wireName()).isEqualTo("upcoming");

        itineraries.start(owner);
        assertThat(storedState(owner.itineraryId())).isEqualTo("ONGOING");
        assertThat(ItineraryState.ONGOING.wireName()).isEqualTo("ongoing");

        itineraries.complete(owner);
        assertThat(storedState(owner.itineraryId())).isEqualTo("COMPLETED");
        assertThat(ItineraryState.COMPLETED.wireName()).isEqualTo("completed");
    }


    @Test
    void theStateColumnHasNoDefault() {
        String columnDefault =
                jdbc.queryForObject(
                        """
                        SELECT column_default FROM information_schema.columns
                         WHERE table_name = 'itinerary' AND column_name = 'state'
                        """,
                        String.class);

        assertThat(columnDefault).as("V3's lying lower-case default, dropped at V12").isNull();

        assertThat(
                        jdbc.queryForObject(
                                """
                                SELECT is_nullable FROM information_schema.columns
                                 WHERE table_name = 'itinerary' AND column_name = 'state'
                                """,
                                String.class))
                .isEqualTo("NO");
    }


    @Test
    void theFieldEditRequestCannotCarryLifecycleState() {
        List<String> editableFields =
                Arrays.stream(com.largata.itinerary.api.UpdateItineraryRequest.class.getRecordComponents())
                        .map(RecordComponent::getName)
                        .toList();

        assertThat(editableFields)
                .as("PATCH edits plan fields only — lifecycle has its own owner-only endpoints")
                .containsExactlyInAnyOrder(
                        "title",
                        "destination",
                        "currency",
                        "description",
                        "standouts",
                        "bestTimeOfYear",
                        "startDate",
                        "endDate")
                .as("the cover ships read-only until S3.3 activates upload — no writer anywhere")
                .doesNotContain("coverImageUrl")
                .doesNotContain("state", "startedAt", "completedAt", "status", "ownerId");
    }


    @Test
    void theAggregateItselfRefusesASkipEdge() {
        Membership owner = tripOwnedByFreshTraveler();

        assertThatThrownBy(() -> itineraries.complete(owner))
                .isInstanceOf(IllegalStateTransitionException.class)
                .hasMessageContaining("upcoming")
                .hasMessageContaining("completed");

        assertThat(storedState(owner.itineraryId())).isEqualTo("UPCOMING");
    }


    private String storedState(UUID itineraryId) {
        return jdbc.queryForObject("SELECT state FROM itinerary WHERE id = ?", String.class, itineraryId);
    }


    private Membership tripOwnedByFreshTraveler() {
        UUID ownerId = UUID.randomUUID();
        Itinerary itinerary = itineraries.create(ownerId, "Planned trip", "Cebu", null, null);
        return new Membership(ownerId, itinerary.id(), Role.OWNER);
    }
}
