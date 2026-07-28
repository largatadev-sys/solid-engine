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

/**
 * S1.7's storage-level and structural pins (spec ACs 3, 5) — the assertions that guard contracts no
 * behavioural test can see fail.
 *
 * <p>Two of the three tests here exist because of failures this repo has already suffered once: an enum
 * spelling silently disagreeing between Hibernate and SQL (the V4 near-miss), and a column default
 * asserting a value the application never writes (V3's own {@code DEFAULT 'draft'}).
 */
@SpringBootTest
class ItineraryLifecycleStorageIT extends PostgresTestBase {

    @Autowired private ItineraryService itineraries;
    @Autowired private JdbcTemplate jdbc;

    /**
     * The column holds the enum's NAME, upper-case — a silent contract with {@code
     * @Enumerated(STRING)} (spec AC 5).
     *
     * <p><strong>Why this is worth a test.</strong> The wire form is lower-case ({@code
     * ItineraryState.wireName()}), so every HTTP assertion in the suite sees {@code "active"} and would
     * pass identically whichever spelling the column held. Any future migration writing {@code WHERE
     * state = 'active'} — a partial index, a backfill, a publish-eligibility constraint — would match
     * zero rows, create successfully, cost nothing and enforce nothing. That is exactly the failure
     * S1.1's first draft of V4 nearly shipped for {@code role = 'owner'}, and the reason its spelling is
     * pinned too. This test fails the moment the storage form moves.
     */
    @Test
    void theStateColumnHoldsTheEnumNameNotTheWireForm() {
        Membership owner = tripOwnedByFreshTraveler();

        assertThat(storedState(owner.itineraryId())).isEqualTo("DRAFT");

        itineraries.start(owner);
        assertThat(storedState(owner.itineraryId())).isEqualTo("ACTIVE");
        assertThat(ItineraryState.ACTIVE.wireName()).isEqualTo("active");

        itineraries.complete(owner);
        assertThat(storedState(owner.itineraryId())).isEqualTo("COMPLETED");
        assertThat(ItineraryState.COMPLETED.wireName()).isEqualTo("completed");
    }

    /**
     * V3's {@code DEFAULT 'draft'} is gone (spec AC 5, V12).
     *
     * <p>It had never once applied — Hibernate always supplies the value and no other INSERT path
     * exists — so it sat in the schema asserting a spelling the application does not use, waiting for
     * the next migration to copy it. Asserting its absence keeps it from being reinstated by a
     * well-meaning future migration that "restores" a default it assumes was dropped by accident.
     */
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

        // NOT NULL is untouched: a caller that omits `state` failed before V12 and still fails after,
        // which is correct for a column the domain is required to populate.
        assertThat(
                        jdbc.queryForObject(
                                """
                                SELECT is_nullable FROM information_schema.columns
                                 WHERE table_name = 'itinerary' AND column_name = 'state'
                                """,
                                String.class))
                .isEqualTo("NO");
    }

    /**
     * <strong>The pin: the field-edit door cannot move lifecycle state</strong> (spec AC 3).
     *
     * <p>{@code PATCH /v1/itineraries/{id}} is member-writable; the transitions are owner-only. If
     * {@code state} ever became an editable field, any member could start or complete somebody's trip,
     * bypassing both the authority check and the state machine's legality rules — and no existing test
     * would notice, because they all drive the endpoints that <em>do</em> guard it.
     *
     * <p>Asserted structurally rather than behaviourally: an HTTP test sending {@code {"state":"active"}}
     * passes today only because Jackson ignores unknown properties, so it would keep passing right up
     * until someone added the field — the check with no failure mode this repo has been burned by three
     * times. The request record's component list is the actual contract, and this fails to compile-time
     * truth the moment a lifecycle field is added to it.
     */
    @Test
    void theFieldEditRequestCannotCarryLifecycleState() {
        List<String> editableFields =
                Arrays.stream(com.largata.itinerary.api.UpdateItineraryRequest.class.getRecordComponents())
                        .map(RecordComponent::getName)
                        .toList();

        assertThat(editableFields)
                .as("PATCH edits plan fields only — lifecycle has its own owner-only endpoints")
                .containsExactlyInAnyOrder("title", "destinations", "description", "startDate", "endDate")
                .doesNotContain("state", "startedAt", "completedAt", "visibility", "ownerId");
    }

    /**
     * The domain refuses an illegal edge even when reached directly, with no controller in the way —
     * the aggregate owns the machine, not the service (spec AC 2's domain half).
     */
    @Test
    void theAggregateItselfRefusesASkipEdge() {
        Membership owner = tripOwnedByFreshTraveler();

        assertThatThrownBy(() -> itineraries.complete(owner))
                .isInstanceOf(IllegalStateTransitionException.class)
                .hasMessageContaining("draft")
                .hasMessageContaining("completed");

        assertThat(storedState(owner.itineraryId())).isEqualTo("DRAFT");
    }

    // --- fixtures ---------------------------------------------------------------------------------

    private String storedState(UUID itineraryId) {
        return jdbc.queryForObject("SELECT state FROM itinerary WHERE id = ?", String.class, itineraryId);
    }

    /** A fresh trip and the OWNER membership the guard would have resolved for its creator. */
    private Membership tripOwnedByFreshTraveler() {
        UUID ownerId = UUID.randomUUID();
        Itinerary itinerary = itineraries.create(ownerId, "Draft trip", List.of("Cebu"), null, null);
        return new Membership(ownerId, itinerary.id(), Role.OWNER);
    }
}
