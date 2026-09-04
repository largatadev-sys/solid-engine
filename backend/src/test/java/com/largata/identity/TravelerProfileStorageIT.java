package com.largata.identity;

import static org.assertj.core.api.Assertions.assertThat;

import com.largata.support.PostgresTestBase;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;


@SpringBootTest
class TravelerProfileStorageIT extends PostgresTestBase {

    @Autowired private TravelerService travelers;
    @Autowired private TravelerProfileService profiles;
    @Autowired private JdbcTemplate jdbc;

    @Test
    void goalsAndInterestsRoundTripThroughPostgresArrays() {
        Traveler traveler = fresh();

        profiles.update(
                traveler.id(),
                edit(List.of("discover", "plan_with_friends", "earn"), List.of("food", "hiking", "history")));

        Traveler reloaded = reload(traveler);
        assertThat(reloaded.goals()).containsExactly("discover", "plan_with_friends", "earn");
        assertThat(reloaded.interests()).containsExactly("food", "hiking", "history");
    }

    @Test
    void theArraysLandInPostgresAsRealArraysAndNotAsOneCommaJoinedString() {
        Traveler traveler = fresh();

        profiles.update(traveler.id(), edit(List.of("discover", "earn"), List.of("food")));

        Integer goalCount =
                jdbc.queryForObject(
                        "SELECT array_length(goals, 1) FROM traveler WHERE id = ?", Integer.class, traveler.id());
        assertThat(goalCount)
                .as("array_length is meaningless on a joined string; this is the mapping's failure mode")
                .isEqualTo(2);
    }

    @Test
    void aTravelerWhoAnsweredNothingReadsAsEmptyRatherThanNull() {
        Traveler traveler = fresh();

        assertThat(traveler.goals()).isEmpty();
        assertThat(traveler.interests()).isEmpty();
    }

    @Test
    void answeringAgainReplacesTheAnswerRatherThanAppendingToIt() {
        Traveler traveler = fresh();
        profiles.update(traveler.id(), edit(List.of("discover", "earn"), List.of("food")));

        profiles.update(traveler.id(), edit(List.of("plan"), List.of("beaches", "diving")));

        Traveler reloaded = reload(traveler);
        assertThat(reloaded.goals()).containsExactly("plan");
        assertThat(reloaded.interests()).containsExactly("beaches", "diving");
    }

    @Test
    void travelSetupStoresTheCountryTheCurrencyAndTheFreeTextCity() {
        Traveler traveler = fresh();

        profiles.update(
                traveler.id(),
                new ProfileEdit(null, null, null, null, null, null, "PH", "PHP", "Puerto Princesa", null));

        Traveler reloaded = reload(traveler);
        assertThat(reloaded.country()).isEqualTo("PH");
        assertThat(reloaded.preferredCurrency()).isEqualTo("PHP");
        assertThat(reloaded.homeCity()).isEqualTo("Puerto Princesa");
    }

    @Test
    void theCompletionMarkerIsSetOnceAndNeverMovesAfterwards() {
        Traveler traveler = fresh();

        profiles.completeOnboarding(traveler.id());
        Instant firstMarker = storedMarkerFor(traveler.id());
        profiles.completeOnboarding(traveler.id());

        assertThat(firstMarker).isNotNull();
        assertThat(storedMarkerFor(traveler.id()))
                .as("compared at the storage's own precision: TIMESTAMPTZ keeps microseconds while "
                        + "an in-memory Instant keeps nanoseconds, so comparing the two rounds-trips a "
                        + "false failure")
                .isEqualTo(firstMarker);
    }

    private Instant storedMarkerFor(UUID travelerId) {
        OffsetDateTime stored =
                jdbc.queryForObject(
                        "SELECT onboarding_completed_at FROM traveler WHERE id = ?",
                        OffsetDateTime.class,
                        travelerId);
        return stored == null ? null : stored.toInstant();
    }

    private Traveler fresh() {
        String uid = "uid-" + UUID.randomUUID();
        return travelers.getOrProvision(TravelerClaims.of(uid, uid + "@example.com", null));
    }

    private Traveler reload(Traveler traveler) {
        return travelers.getOrProvision(
                TravelerClaims.of(traveler.firebaseUid(), traveler.email(), traveler.displayName()));
    }

    private static ProfileEdit edit(List<String> goals, List<String> interests) {
        return new ProfileEdit(null, null, null, null, goals, interests, null, null, null, null);
    }
}
