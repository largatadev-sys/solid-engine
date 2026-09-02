package com.largata.itinerary;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;
import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.postgresql.PostgreSQLContainer;


class PinColumnsIT {

    private static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");

    private static JdbcTemplate jdbc;
    private static DataSource dataSource;

    private static final UUID ANA = UUID.randomUUID();

    private static final UUID A_LEGACY_TRIP = UUID.randomUUID();

    private static final UUID A_LEGACY_DAY = UUID.randomUUID();

    private static final UUID A_LEGACY_ACTIVITY = UUID.randomUUID();

    private static final Instant CREATED_AT = Instant.parse("2026-05-02T11:00:00Z").truncatedTo(ChronoUnit.MICROS);

    @BeforeAll
    static void migrateToTheEveOfThePinsThenApplyThem() {
        POSTGRES.start();
        DriverManagerDataSource source = new DriverManagerDataSource();
        source.setUrl(POSTGRES.getJdbcUrl());
        source.setUsername(POSTGRES.getUsername());
        source.setPassword(POSTGRES.getPassword());
        dataSource = source;
        jdbc = new JdbcTemplate(dataSource);

        flywayTo("43").migrate();

        assertThat(columnExists("itinerary", "latitude")).as("the fixture is genuinely pre-V44").isFalse();
        assertThat(columnExists("activity", "latitude")).as("…on both tables").isFalse();

        seedLegacyPlan();

        flywayTo("44").migrate();
    }


    @Test
    void aLegacyActivitySurvivesTheMigrationAndArrivesPinless() {
        assertThat(jdbc.queryForObject("SELECT place FROM activity WHERE id = ?", String.class, A_LEGACY_ACTIVITY))
                .as("no backfill: the text a traveler typed is exactly what it was")
                .isEqualTo("Big Lagoon");
        assertThat(pinOf("activity", A_LEGACY_ACTIVITY))
                .as("text-only is a permanent state, not a migration backlog")
                .isNull();
    }


    @Test
    void aLegacyItinerarySurvivesTheMigrationAndArrivesPinless() {
        assertThat(jdbc.queryForObject(
                        "SELECT destination FROM itinerary WHERE id = ?", String.class, A_LEGACY_TRIP))
                .isEqualTo("El Nido, Palawan");
        assertThat(pinOf("itinerary", A_LEGACY_TRIP)).isNull();
    }


    @Test
    void aPinCanBeWrittenOntoALegacyRowWithoutTouchingAnythingElse() {
        jdbc.update(
                "UPDATE activity SET latitude = ?, longitude = ?, zoom = ? WHERE id = ?",
                new BigDecimal("11.194900"),
                new BigDecimal("119.401300"),
                (short) 15,
                A_LEGACY_ACTIVITY);

        assertThat(pinOf("activity", A_LEGACY_ACTIVITY)).isEqualByComparingTo("11.194900");

        jdbc.update("UPDATE activity SET latitude = NULL, longitude = NULL, zoom = NULL WHERE id = ?",
                A_LEGACY_ACTIVITY);
    }


    @Test
    void halfAPinCannotBeStored_becauseTheThreeColumnsTravelTogether() {
        assertThat(catchThrowable(() -> jdbc.update(
                        "UPDATE activity SET latitude = ? WHERE id = ?",
                        new BigDecimal("11.194900"),
                        A_LEGACY_ACTIVITY)))
                .as("a latitude alone plants a row every reader would have to defend against")
                .isNotNull()
                .hasMessageContaining("activity_pin_is_whole");
    }


    @Test
    void aPinOffTheEarthCannotBeStored() {
        assertThat(catchThrowable(() -> jdbc.update(
                        "UPDATE itinerary SET latitude = ?, longitude = ?, zoom = ? WHERE id = ?",
                        new BigDecimal("91.000000"),
                        new BigDecimal("0.000000"),
                        (short) 12,
                        A_LEGACY_TRIP)))
                .isNotNull()
                .hasMessageContaining("itinerary_pin_is_on_earth");
    }


    @Test
    void aZoomTheProviderDoesNotServeCannotBeStored() {
        assertThat(catchThrowable(() -> jdbc.update(
                        "UPDATE itinerary SET latitude = ?, longitude = ?, zoom = ? WHERE id = ?",
                        new BigDecimal("11.194900"),
                        new BigDecimal("119.401300"),
                        (short) 25,
                        A_LEGACY_TRIP)))
                .as("a zoom beyond the tile provider renders a grey screen of missing tiles")
                .isNotNull()
                .hasMessageContaining("itinerary_pin_is_on_earth");
    }


    @Test
    void theColumnsExistOnBothTablesAfterTheMigration() {
        for (String table : new String[] {"activity", "itinerary"}) {
            for (String column : new String[] {"latitude", "longitude", "zoom"}) {
                assertThat(columnExists(table, column)).as(table + "." + column).isTrue();
            }
        }
    }


    private static void seedLegacyPlan() {
        jdbc.update(
                "INSERT INTO itinerary (id, owner_id, title, destination, standouts, state, visibility,"
                        + " published, created_at) VALUES (?, ?, ?, ?, '{}', 'DRAFT', 'PUBLIC', false, ?)",
                A_LEGACY_TRIP,
                ANA,
                "Palawan, before pins existed",
                "El Nido, Palawan",
                Timestamp.from(CREATED_AT));
        jdbc.update(
                "INSERT INTO day (id, itinerary_id, ordinal, created_at) VALUES (?, ?, 1, ?)",
                A_LEGACY_DAY,
                A_LEGACY_TRIP,
                Timestamp.from(CREATED_AT));
        jdbc.update(
                "INSERT INTO activity (id, day_id, sort_order, title, place, last_edited_by, last_edited_at,"
                        + " created_at) VALUES (?, ?, 1, ?, ?, ?, ?, ?)",
                A_LEGACY_ACTIVITY,
                A_LEGACY_DAY,
                "Kayak the lagoon",
                "Big Lagoon",
                ANA,
                Timestamp.from(CREATED_AT),
                Timestamp.from(CREATED_AT));
    }


    private static Flyway flywayTo(String version) {
        return Flyway.configure().dataSource(dataSource).target(version).load();
    }


    private static BigDecimal pinOf(String table, UUID id) {
        return jdbc.queryForObject("SELECT latitude FROM " + table + " WHERE id = ?", BigDecimal.class, id);
    }


    private static boolean columnExists(String table, String column) {
        Integer found = jdbc.queryForObject(
                "SELECT count(*) FROM information_schema.columns WHERE table_name = ? AND column_name = ?",
                Integer.class,
                table,
                column);
        return found != null && found > 0;
    }
}
