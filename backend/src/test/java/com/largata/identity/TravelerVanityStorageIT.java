package com.largata.identity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatExceptionOfType;

import com.largata.support.PostgresTestBase;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;


@SpringBootTest
class TravelerVanityStorageIT extends PostgresTestBase {

    @Autowired private JdbcTemplate jdbc;

    @Test
    void twoTravelersCannotShareANumberWithinACohort() {
        short cohort = freshCohort();
        plant(cohort, 42);

        assertThatExceptionOfType(DataIntegrityViolationException.class)
                .as("the whole point of the pool: a drawn number is gone for good")
                .isThrownBy(() -> plant(cohort, 42));
    }


    @Test
    void theSameNumberInADifferentCohortIsADifferentNumber() {
        short cohort = freshCohort();

        assertThatCode(
                        () -> {
                            plant(cohort, 7);
                            plant((short) (cohort + 1), 7);
                        })
                .as("uniqueness is per cohort - 010007 and 020007 are different travelers")
                .doesNotThrowAnyException();
    }


    @Test
    void everyFounderHoldsTheSameZeroAndTheIndexMustAllowIt() {
        assertThatCode(
                        () -> {
                            plant((short) 0, 0);
                            plant((short) 0, 0);
                            plant((short) 0, 0);
                        })
                .as("this is what the partial predicate exists for: a plain UNIQUE would refuse "
                        + "the second founder, and founder-0 is shared by decision")
                .doesNotThrowAnyException();
    }


    @Test
    void theIndexIsPartialOnTheSchemeAndNotOnEveryRow() {
        String definition =
                jdbc.queryForObject(
                        "SELECT indexdef FROM pg_indexes WHERE indexname = 'traveler_vanity_idx'", String.class);

        assertThat(definition)
                .as("if the predicate is dropped the founders collide; if the index is dropped the "
                        + "scheme stops being unique - the two failures are opposite and both silent")
                .contains("WHERE (vanity_cohort > 0)");
    }


    @Test
    void everyPreS414RowMayHaveNoNumberAtAll() {
        assertThatCode(
                        () -> {
                            plant(null, null);
                            plant(null, null);
                        })
                .as("V24 is additive: rows that predate it stay legal until V25 backfills them")
                .doesNotThrowAnyException();
    }


    private UUID plant(Short cohort, Integer poolNumber) {
        UUID id = UUID.randomUUID();
        jdbc.update(
                "INSERT INTO traveler (id, firebase_uid, email, display_name, created_at, "
                        + "vanity_cohort, vanity_pool_number) VALUES (?, ?, ?, ?, now(), ?, ?)",
                id,
                "uid-" + id,
                id + "@example.com",
                "Planted",
                cohort,
                poolNumber);
        return id;
    }


    private static short freshCohort() {
        return (short) ThreadLocalRandom.current().nextInt(1000, 30000);
    }
}
