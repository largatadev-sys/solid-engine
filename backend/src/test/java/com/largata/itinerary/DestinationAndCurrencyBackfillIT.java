package com.largata.itinerary;

import static org.assertj.core.api.Assertions.assertThat;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.UUID;
import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.postgresql.PostgreSQLContainer;


class DestinationAndCurrencyBackfillIT {

    private static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");

    private static DataSource dataSource;
    private static JdbcTemplate jdbc;

    private static final UUID SEEDER_SHAPED_TRIP = UUID.randomUUID();
    private static final UUID SINGLE_DESTINATION_TRIP = UUID.randomUUID();
    private static final UUID UNANIMOUS_CURRENCY_TRIP = UUID.randomUUID();
    private static final UUID MIXED_CURRENCY_TRIP = UUID.randomUUID();
    private static final UUID UNPRICED_TRIP = UUID.randomUUID();
    private static final UUID BLANK_CURRENCY_TRIP = UUID.randomUUID();
    private static final UUID CASE_VARIANT_CURRENCY_TRIP = UUID.randomUUID();

    private static final UUID OWNER = UUID.randomUUID();
    private static final Instant CREATED_AT = Instant.parse("2026-03-01T10:15:30Z");


    @BeforeAll
    static void migrateToTheEveOfTheNarrowingThenApplyIt() {
        POSTGRES.start();
        DriverManagerDataSource source = new DriverManagerDataSource();
        source.setUrl(POSTGRES.getJdbcUrl());
        source.setUsername(POSTGRES.getUsername());
        source.setPassword(POSTGRES.getPassword());
        dataSource = source;
        jdbc = new JdbcTemplate(dataSource);

        flywayTo("32").migrate();

        seedLegacyItinerary(SEEDER_SHAPED_TRIP, "Palawan trip", "Palawan", "El Nido", "Philippines");
        seedLegacyItinerary(SINGLE_DESTINATION_TRIP, "Boracay Barkada Trip", "Boracay");
        seedLegacyItinerary(UNANIMOUS_CURRENCY_TRIP, "Bangkok food crawl", "Bangkok");
        seedLegacyItinerary(MIXED_CURRENCY_TRIP, "Two-country hop", "Singapore", "Kuala Lumpur");
        seedLegacyItinerary(UNPRICED_TRIP, "Someday trip", "Sapporo");
        seedLegacyItinerary(BLANK_CURRENCY_TRIP, "Blank money trip", "Cebu");
        seedLegacyItinerary(CASE_VARIANT_CURRENCY_TRIP, "Sloppy money trip", "Hanoi");

        seedPricedActivity(UNANIMOUS_CURRENCY_TRIP, 1, "Boat noodles", "120.00", "THB");
        seedPricedActivity(UNANIMOUS_CURRENCY_TRIP, 2, "Rooftop bar", "600.00", "THB");

        seedPricedActivity(MIXED_CURRENCY_TRIP, 1, "Gardens by the Bay", "28.00", "SGD");
        seedPricedActivity(MIXED_CURRENCY_TRIP, 2, "Batu Caves", "50.00", "MYR");

        seedPricedActivity(SEEDER_SHAPED_TRIP, 1, "Island hopping", "1500.00", "PHP");

        seedUnpricedActivity(UNPRICED_TRIP, 1, "Walk around");

        seedPricedActivity(BLANK_CURRENCY_TRIP, 1, "Ferry", "300.00", "   ");

        seedPricedActivity(CASE_VARIANT_CURRENCY_TRIP, 1, "Egg coffee", "40000.00", "vnd");
        seedPricedActivity(CASE_VARIANT_CURRENCY_TRIP, 2, "Water puppets", "100000.00", " VND ");

        assertThat(columnExists("destinations")).as("the fixture is the legacy shape").isTrue();
        assertThat(columnExists("destination")).as("the fixture predates the narrowing").isFalse();
        assertThat(columnExists("currency")).as("the fixture predates the trip currency").isFalse();

        flywayTo("33").migrate();
    }


    @Test
    void theListIsGoneAndTheScalarIsMandatory() {
        assertThat(columnExists("destinations")).isFalse();
        assertThat(columnExists("destination")).isTrue();
        assertThat(isNullable("destination")).isFalse();
    }


    @Test
    void aMultiDestinationTripKeepsItsFirstEntryAndDropsTheDerivedRegion() {
        assertThat(destinationOf(SEEDER_SHAPED_TRIP)).isEqualTo("Palawan");
    }


    @Test
    void aSingleDestinationTripIsUnchanged() {
        assertThat(destinationOf(SINGLE_DESTINATION_TRIP)).isEqualTo("Boracay");
    }


    @Test
    void aTripWhoseActivitiesAgreeTakesTheirCurrency() {
        assertThat(currencyOf(UNANIMOUS_CURRENCY_TRIP)).isEqualTo("THB");
    }


    @Test
    void aTripWhoseActivitiesDisagreeFallsBackToTheDefault() {
        assertThat(currencyOf(MIXED_CURRENCY_TRIP)).isEqualTo("PHP");
    }


    @Test
    void aTripWithNoPricedActivitiesFallsBackToTheDefault() {
        assertThat(currencyOf(UNPRICED_TRIP)).isEqualTo("PHP");
    }


    @Test
    void aBlankCurrencyCountsAsAbsentRatherThanAsACurrency() {
        assertThat(currencyOf(BLANK_CURRENCY_TRIP)).isEqualTo("PHP");
    }


    @Test
    void spellingVariantsOfOneCurrencyAreStillUnanimous() {
        assertThat(currencyOf(CASE_VARIANT_CURRENCY_TRIP)).isEqualTo("VND");
    }


    @Test
    void everyTripHasACurrencyAfterTheBackfill() {
        assertThat(count("SELECT count(*) FROM itinerary WHERE currency IS NULL")).isZero();
    }


    @Test
    void theActivitiesKeepTheirOwnStoredCurrency() {
        assertThat(currencyOfActivity(MIXED_CURRENCY_TRIP, 1)).isEqualTo("SGD");
        assertThat(currencyOfActivity(MIXED_CURRENCY_TRIP, 2)).isEqualTo("MYR");
    }


    private static Flyway flywayTo(String version) {
        return Flyway.configure()
                .dataSource(dataSource)
                .locations("classpath:db/migration")
                .target(version)
                .cleanDisabled(false)
                .load();
    }


    private static void seedLegacyItinerary(UUID id, String title, String... destinations) {
        jdbc.update(
                "INSERT INTO itinerary (id, owner_id, title, destinations, standouts, published, "
                        + "state, visibility, created_at) "
                        + "VALUES (?, ?, ?, ?, '{}', false, 'DRAFT', 'PUBLIC', ?)",
                id,
                OWNER,
                title,
                destinations,
                Timestamp.from(CREATED_AT));
    }


    private static void seedPricedActivity(
            UUID itineraryId, int ordinal, String title, String amount, String currency) {
        UUID dayId = seedDay(itineraryId, ordinal);
        jdbc.update(
                "INSERT INTO activity (id, day_id, sort_order, title, cost_amount, cost_currency, "
                        + "last_edited_by, last_edited_at, created_at) "
                        + "VALUES (?, ?, ?, ?, CAST(? AS numeric), ?, ?, ?, ?)",
                UUID.randomUUID(),
                dayId,
                ordinal,
                title,
                amount,
                currency,
                OWNER,
                Timestamp.from(CREATED_AT),
                Timestamp.from(CREATED_AT));
    }


    private static void seedUnpricedActivity(UUID itineraryId, int ordinal, String title) {
        UUID dayId = seedDay(itineraryId, ordinal);
        jdbc.update(
                "INSERT INTO activity (id, day_id, sort_order, title, "
                        + "last_edited_by, last_edited_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                UUID.randomUUID(),
                dayId,
                ordinal,
                title,
                OWNER,
                Timestamp.from(CREATED_AT),
                Timestamp.from(CREATED_AT));
    }


    private static UUID seedDay(UUID itineraryId, int ordinal) {
        UUID dayId = UUID.randomUUID();
        jdbc.update(
                "INSERT INTO day (id, itinerary_id, ordinal, created_at) VALUES (?, ?, ?, ?)",
                dayId,
                itineraryId,
                ordinal,
                Timestamp.from(CREATED_AT));
        return dayId;
    }


    private static boolean columnExists(String column) {
        return count(
                        "SELECT count(*) FROM information_schema.columns "
                                + "WHERE table_name = 'itinerary' AND column_name = '"
                                + column
                                + "'")
                > 0;
    }


    private static boolean isNullable(String column) {
        return "YES"
                .equals(
                        jdbc.queryForObject(
                                "SELECT is_nullable FROM information_schema.columns "
                                        + "WHERE table_name = 'itinerary' AND column_name = ?",
                                String.class,
                                column));
    }


    private static String destinationOf(UUID id) {
        return jdbc.queryForObject("SELECT destination FROM itinerary WHERE id = ?", String.class, id);
    }


    private static String currencyOf(UUID id) {
        return jdbc.queryForObject("SELECT currency FROM itinerary WHERE id = ?", String.class, id);
    }


    private static String currencyOfActivity(UUID itineraryId, int ordinal) {
        return jdbc.queryForObject(
                "SELECT a.cost_currency FROM activity a JOIN day d ON d.id = a.day_id "
                        + "WHERE d.itinerary_id = ? AND d.ordinal = ?",
                String.class,
                itineraryId,
                ordinal);
    }


    private static long count(String sql) {
        Long value = jdbc.queryForObject(sql, Long.class);
        return value == null ? 0 : value;
    }
}
