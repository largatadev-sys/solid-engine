package com.largata.diary;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatExceptionOfType;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.postgresql.PostgreSQLContainer;


class DiaryDaySteppingIT {

    private static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");

    private static JdbcTemplate jdbc;

    private static final UUID AUTHOR = UUID.randomUUID();
    private static final UUID CM1_DIARY = UUID.randomUUID();
    private static final Instant WRITTEN_AT = Instant.parse("2026-03-15T08:00:00Z");

    @BeforeAll
    static void seedTheOldShapeThenApply() {
        POSTGRES.start();
        DriverManagerDataSource source = new DriverManagerDataSource();
        source.setUrl(POSTGRES.getJdbcUrl());
        source.setUsername(POSTGRES.getUsername());
        source.setPassword(POSTGRES.getPassword());
        DataSource dataSource = source;
        jdbc = new JdbcTemplate(dataSource);

        Flyway.configure()
                .dataSource(dataSource)
                .locations("classpath:db/migration")
                .target("52")
                .cleanDisabled(false)
                .load()
                .migrate();

        jdbc.update(
                "INSERT INTO traveler (id, firebase_uid, email, display_name, created_at)"
                        + " VALUES (?, ?, ?, ?, now())",
                AUTHOR,
                "uid-" + AUTHOR,
                AUTHOR + "@example.com",
                "Stepping Fixture");
        jdbc.update(
                "INSERT INTO diary (id, author_id, trip_id, title, created_at, updated_at)"
                        + " VALUES (?, ?, NULL, 'A CM-1 diary', ?, ?)",
                CM1_DIARY,
                AUTHOR,
                Timestamp.from(WRITTEN_AT),
                Timestamp.from(WRITTEN_AT));

        Flyway.configure()
                .dataSource(dataSource)
                .locations("classpath:db/migration")
                .target("53")
                .cleanDisabled(false)
                .load()
                .migrate();
    }


    @Test
    void aDiaryWrittenBeforeTheReCutTakesTheDayItWasWrittenAsItsRange() {
        assertThat(
                        jdbc.queryForObject(
                                "SELECT start_date FROM diary WHERE id = ?",
                                LocalDate.class,
                                CM1_DIARY))
                .as("a CM-1 diary never recorded when its trip happened; the day it was written is"
                        + " the only honest value available")
                .isEqualTo(LocalDate.of(2026, 3, 15));
        assertThat(
                        jdbc.queryForObject(
                                "SELECT end_date FROM diary WHERE id = ?", LocalDate.class, CM1_DIARY))
                .isEqualTo(LocalDate.of(2026, 3, 15));
        assertThat(
                        jdbc.queryForObject(
                                "SELECT destination FROM diary WHERE id = ?", String.class, CM1_DIARY))
                .as("destination is optional and no CM-1 row can supply one")
                .isNull();
    }


    @Test
    void aDiaryCannotEndBeforeItStarts() {
        assertThatExceptionOfType(DataIntegrityViolationException.class)
                .isThrownBy(
                        () ->
                                jdbc.update(
                                        "UPDATE diary SET end_date = start_date - 1 WHERE id = ?",
                                        CM1_DIARY));
    }


    @Test
    void oneDayPerDatePerDiary() {
        UUID diary = diaryWithRange(LocalDate.of(2026, 3, 15), LocalDate.of(2026, 3, 19));
        insertDay(diary, 1, LocalDate.of(2026, 3, 15));

        assertThatExceptionOfType(DuplicateKeyException.class)
                .as("a second day on the same date is refused by the index, not only by the service")
                .isThrownBy(() -> insertDay(diary, 1, LocalDate.of(2026, 3, 15)));
    }


    @Test
    void aSkippedDayLeavesAGapRatherThanRenumberingItsNeighbours() {
        UUID diary = diaryWithRange(LocalDate.of(2026, 3, 15), LocalDate.of(2026, 3, 19));
        insertDay(diary, 1, LocalDate.of(2026, 3, 15));
        insertDay(diary, 2, LocalDate.of(2026, 3, 16));
        insertDay(diary, 5, LocalDate.of(2026, 3, 19));

        assertThat(
                        jdbc.queryForList(
                                "SELECT ordinal FROM diary_day WHERE diary_id = ? ORDER BY ordinal",
                                Integer.class,
                                diary))
                .as("the ordinal comes from the date, so Mar 15, 16 and 19 read Day 1, Day 2, Day 5")
                .containsExactly(1, 2, 5);
    }


    @Test
    void aDayIsNumberedFromOne() {
        UUID diary = diaryWithRange(LocalDate.of(2026, 3, 15), LocalDate.of(2026, 3, 19));

        assertThatExceptionOfType(DataIntegrityViolationException.class)
                .isThrownBy(() -> insertDay(diary, 0, LocalDate.of(2026, 3, 15)));
    }


    @Test
    void theTripDayReferenceCarriesNoForeignKey() {
        assertThat(
                        jdbc.queryForObject(
                                "SELECT count(*) FROM information_schema.table_constraints"
                                        + " WHERE table_name = 'diary_day'"
                                        + " AND constraint_type = 'FOREIGN KEY'"
                                        + " AND constraint_name LIKE '%trip%'",
                                Integer.class))
                .as("a derived day outlives the owner destroying the trip it snapshots")
                .isZero();
    }


    @Test
    void aDiaryCannotBeDeletedOutFromUnderItsDays() {
        UUID diary = diaryWithRange(LocalDate.of(2026, 3, 15), LocalDate.of(2026, 3, 19));
        insertDay(diary, 1, LocalDate.of(2026, 3, 15));

        assertThatExceptionOfType(DataIntegrityViolationException.class)
                .as("NO ACTION, not CASCADE: the delete must go through the service that also"
                        + " cleans the object store")
                .isThrownBy(() -> jdbc.update("DELETE FROM diary WHERE id = ?", diary));
    }


    @Test
    void aPostcardIsLooseUntilItIsGivenADay() {
        UUID diary = diaryWithRange(LocalDate.of(2026, 3, 15), LocalDate.of(2026, 3, 19));
        UUID day = insertDay(diary, 1, LocalDate.of(2026, 3, 15));
        UUID loose = insertPostcard(null, null);
        UUID homed = insertPostcard(diary, day);

        assertThat(jdbc.queryForObject(
                        "SELECT diary_day_id FROM postcard WHERE id = ?", UUID.class, loose))
                .as("NULL is loose — a single nullable column IS the at-most-one-day rule")
                .isNull();
        assertThat(jdbc.queryForObject(
                        "SELECT diary_day_id FROM postcard WHERE id = ?", UUID.class, homed))
                .isEqualTo(day);
    }


    private static UUID diaryWithRange(LocalDate start, LocalDate end) {
        UUID id = UUID.randomUUID();
        jdbc.update(
                "INSERT INTO diary (id, author_id, trip_id, title, start_date, end_date,"
                        + " created_at, updated_at)"
                        + " VALUES (?, ?, NULL, 'Stepping diary', ?, ?, ?, ?)",
                id,
                AUTHOR,
                start,
                end,
                Timestamp.from(WRITTEN_AT),
                Timestamp.from(WRITTEN_AT));
        return id;
    }


    private static UUID insertDay(UUID diaryId, int ordinal, LocalDate date) {
        UUID id = UUID.randomUUID();
        jdbc.update(
                "INSERT INTO diary_day (id, diary_id, ordinal, date, created_at, updated_at)"
                        + " VALUES (?, ?, ?, ?, ?, ?)",
                id,
                diaryId,
                ordinal,
                date,
                Timestamp.from(WRITTEN_AT),
                Timestamp.from(WRITTEN_AT));
        return id;
    }


    private static UUID insertPostcard(UUID diaryId, UUID dayId) {
        UUID id = UUID.randomUUID();
        jdbc.update(
                "INSERT INTO postcard (id, author_id, diary_id, diary_day_id, created_at, updated_at)"
                        + " VALUES (?, ?, ?, ?, ?, ?)",
                id,
                AUTHOR,
                diaryId,
                dayId,
                Timestamp.from(WRITTEN_AT),
                Timestamp.from(WRITTEN_AT));
        return id;
    }
}
