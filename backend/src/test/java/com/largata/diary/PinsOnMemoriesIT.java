package com.largata.diary;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.UUID;
import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.postgresql.PostgreSQLContainer;


class PinsOnMemoriesIT {

    private static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");

    private static JdbcTemplate jdbc;
    private static DataSource dataSource;

    private static final UUID ANA = UUID.randomUUID();
    private static final UUID A_LEGACY_DIARY = UUID.randomUUID();
    private static final UUID A_LEGACY_DAY = UUID.randomUUID();
    private static final UUID A_LEGACY_POSTCARD = UUID.randomUUID();

    private static final BigDecimal BIG_LAGOON_LAT = new BigDecimal("11.194900");
    private static final BigDecimal BIG_LAGOON_LNG = new BigDecimal("119.401300");

    private static final Instant CREATED_AT =
            Instant.parse("2026-05-02T11:00:00Z").truncatedTo(ChronoUnit.MICROS);


    @BeforeAll
    static void migrateToTheEveOfThePinsThenApplyThem() {
        POSTGRES.start();
        DriverManagerDataSource source = new DriverManagerDataSource();
        source.setUrl(POSTGRES.getJdbcUrl());
        source.setUsername(POSTGRES.getUsername());
        source.setPassword(POSTGRES.getPassword());
        dataSource = source;
        jdbc = new JdbcTemplate(dataSource);

        flywayTo("54").migrate();
        assertThat(columnExists("diary", "latitude")).as("the fixture is genuinely pre-V55").isFalse();
        assertThat(columnExists("diary_day", "latitude")).as("…on the day too").isFalse();
        seedALegacyMemory();
        flywayTo("55").migrate();
    }


    @AfterEach
    void putTheSeededRowsBackAsTheMigrationLeftThem() {
        jdbc.update(
                "UPDATE diary SET destination = ?, latitude = NULL, longitude = NULL, zoom = NULL"
                        + " WHERE id = ?",
                "El Nido, Palawan",
                A_LEGACY_DIARY);
        jdbc.update(
                "UPDATE diary_day SET place = ?, latitude = NULL, longitude = NULL, zoom = NULL"
                        + " WHERE id = ?",
                "Big Lagoon",
                A_LEGACY_DAY);
        jdbc.update(
                "UPDATE postcard SET place = ?, latitude = NULL, longitude = NULL, zoom = NULL"
                        + " WHERE id = ?",
                "Big Lagoon",
                A_LEGACY_POSTCARD);
    }


    @Test
    void aLegacyDiarySurvivesTheMigrationAndArrivesPinless() {
        assertThat(
                        jdbc.queryForObject(
                                "SELECT destination FROM diary WHERE id = ?",
                                String.class,
                                A_LEGACY_DIARY))
                .as("no backfill: the text a traveler typed is exactly what it was")
                .isEqualTo("El Nido, Palawan");
        assertThat(latitudeOf("diary", A_LEGACY_DIARY))
                .as("text-only is a permanent state, not a migration backlog")
                .isNull();
    }


    @Test
    void aLegacyDaySurvivesTheMigrationAndArrivesPinless() {
        assertThat(
                        jdbc.queryForObject(
                                "SELECT place FROM diary_day WHERE id = ?", String.class, A_LEGACY_DAY))
                .isEqualTo("Big Lagoon");
        assertThat(latitudeOf("diary_day", A_LEGACY_DAY)).isNull();
    }


    @Test
    void aLegacyPostcardSurvivesTheNewConstraintsUnpinned() {
        assertThat(latitudeOf("postcard", A_LEGACY_POSTCARD))
                .as("V51 gave postcard its columns; V55 only adds the promise it lacked")
                .isNull();
    }


    @Test
    void aPinCanBeWrittenOntoEachLegacyRowWithoutTouchingAnythingElse() {
        pin("diary", A_LEGACY_DIARY);
        pin("diary_day", A_LEGACY_DAY);
        pin("postcard", A_LEGACY_POSTCARD);

        assertThat(latitudeOf("diary", A_LEGACY_DIARY)).isEqualByComparingTo(BIG_LAGOON_LAT);
        assertThat(latitudeOf("diary_day", A_LEGACY_DAY)).isEqualByComparingTo(BIG_LAGOON_LAT);
        assertThat(latitudeOf("postcard", A_LEGACY_POSTCARD)).isEqualByComparingTo(BIG_LAGOON_LAT);
        assertThat(
                        jdbc.queryForObject(
                                "SELECT destination FROM diary WHERE id = ?",
                                String.class,
                                A_LEGACY_DIARY))
                .isEqualTo("El Nido, Palawan");
    }


    @Test
    void halfAPinIsUnstorableOnEveryOneOfTheThreeTables() {
        for (String table : new String[] {"diary", "diary_day", "postcard"}) {
            Throwable refused =
                    catchThrowable(
                            () ->
                                    jdbc.update(
                                            "UPDATE " + table + " SET latitude = ? WHERE id = ?",
                                            BIG_LAGOON_LAT,
                                            idOf(table)));

            assertThat(refused)
                    .as("%s: the three columns travel together or not at all", table)
                    .hasMessageContaining("pin_is_whole");
        }
    }


    @Test
    void aPointOffTheEarthIsUnstorable() {
        Throwable refused =
                catchThrowable(
                        () ->
                                jdbc.update(
                                        "UPDATE diary_day SET latitude = ?, longitude = ?, zoom = ?"
                                                + " WHERE id = ?",
                                        new BigDecimal("91.000000"),
                                        BIG_LAGOON_LNG,
                                        (short) 15,
                                        A_LEGACY_DAY));

        assertThat(refused).hasMessageContaining("pin_is_on_earth");
    }


    @Test
    void aZoomTheProviderDoesNotServeIsUnstorable() {
        Throwable refused =
                catchThrowable(
                        () ->
                                jdbc.update(
                                        "UPDATE diary_day SET latitude = ?, longitude = ?, zoom = ?"
                                                + " WHERE id = ?",
                                        BIG_LAGOON_LAT,
                                        BIG_LAGOON_LNG,
                                        (short) 25,
                                        A_LEGACY_DAY));

        assertThat(refused).hasMessageContaining("pin_is_on_earth");
    }


    @Test
    void aPinWithNothingToCallItIsUnstorable() {
        jdbc.update("UPDATE diary_day SET place = NULL WHERE id = ?", A_LEGACY_DAY);

        Throwable refused =
                catchThrowable(
                        () ->
                                jdbc.update(
                                        "UPDATE diary_day SET latitude = ?, longitude = ?, zoom = ?"
                                                + " WHERE id = ?",
                                        BIG_LAGOON_LAT,
                                        BIG_LAGOON_LNG,
                                        (short) 15,
                                        A_LEGACY_DAY));

        assertThat(refused).hasMessageContaining("pin_needs_a_place");
    }


    @Test
    void aBlankNameIsTheSameAsNoName() {
        jdbc.update("UPDATE diary SET destination = ? WHERE id = ?", "   ", A_LEGACY_DIARY);

        Throwable refused =
                catchThrowable(
                        () ->
                                jdbc.update(
                                        "UPDATE diary SET latitude = ?, longitude = ?, zoom = ?"
                                                + " WHERE id = ?",
                                        BIG_LAGOON_LAT,
                                        BIG_LAGOON_LNG,
                                        (short) 15,
                                        A_LEGACY_DIARY));

        assertThat(refused).hasMessageContaining("pin_needs_a_destination");
    }


    private static void pin(String table, UUID id) {
        jdbc.update(
                "UPDATE " + table + " SET latitude = ?, longitude = ?, zoom = ? WHERE id = ?",
                BIG_LAGOON_LAT,
                BIG_LAGOON_LNG,
                (short) 15,
                id);
    }


    private static UUID idOf(String table) {
        return switch (table) {
            case "diary" -> A_LEGACY_DIARY;
            case "diary_day" -> A_LEGACY_DAY;
            default -> A_LEGACY_POSTCARD;
        };
    }


    private static void seedALegacyMemory() {
        jdbc.update(
                "INSERT INTO traveler (id, firebase_uid, email, display_name, handle, created_at)"
                        + " VALUES (?, ?, ?, ?, ?, ?)",
                ANA,
                "uid-" + ANA,
                "ana@example.test",
                "Ana Duarte",
                "ana" + Math.abs(ANA.hashCode()),
                Timestamp.from(CREATED_AT));

        jdbc.update(
                "INSERT INTO diary (id, author_id, title, destination, start_date, end_date,"
                        + " created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                A_LEGACY_DIARY,
                ANA,
                "Palawan by boat",
                "El Nido, Palawan",
                LocalDate.of(2026, 3, 15),
                LocalDate.of(2026, 3, 20),
                Timestamp.from(CREATED_AT),
                Timestamp.from(CREATED_AT));

        jdbc.update(
                "INSERT INTO diary_day (id, diary_id, ordinal, date, place, created_at, updated_at)"
                        + " VALUES (?, ?, ?, ?, ?, ?, ?)",
                A_LEGACY_DAY,
                A_LEGACY_DIARY,
                1,
                LocalDate.of(2026, 3, 15),
                "Big Lagoon",
                Timestamp.from(CREATED_AT),
                Timestamp.from(CREATED_AT));

        jdbc.update(
                "INSERT INTO postcard (id, author_id, diary_id, diary_day_id, place, caption,"
                        + " created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                A_LEGACY_POSTCARD,
                ANA,
                A_LEGACY_DIARY,
                A_LEGACY_DAY,
                "Big Lagoon",
                "Kayaked in at dawn",
                Timestamp.from(CREATED_AT),
                Timestamp.from(CREATED_AT));
    }


    private static Flyway flywayTo(String version) {
        return Flyway.configure().dataSource(dataSource).target(version).load();
    }


    private static BigDecimal latitudeOf(String table, UUID id) {
        return jdbc.queryForObject(
                "SELECT latitude FROM " + table + " WHERE id = ?", BigDecimal.class, id);
    }


    private static boolean columnExists(String table, String column) {
        Integer found =
                jdbc.queryForObject(
                        "SELECT count(*) FROM information_schema.columns"
                                + " WHERE table_name = ? AND column_name = ?",
                        Integer.class,
                        table,
                        column);
        return found != null && found > 0;
    }
}
