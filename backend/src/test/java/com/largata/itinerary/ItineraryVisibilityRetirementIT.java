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


class ItineraryVisibilityRetirementIT {

    private static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");

    private static DataSource dataSource;
    private static JdbcTemplate jdbc;

    private static final UUID ANA = UUID.randomUUID();

    private static final UUID PUBLISHED_TO_A_PRIVATE_AUDIENCE = UUID.randomUUID();
    private static final UUID ALSO_PUBLISHED_TO_A_PRIVATE_AUDIENCE = UUID.randomUUID();

    private static final UUID PUBLISHED_PUBLICLY = UUID.randomUUID();
    private static final UUID NEVER_PUBLISHED_AND_PRIVATE = UUID.randomUUID();

    private static final Instant PUBLISHED_AT = Instant.parse("2026-04-01T08:00:00Z");
    private static final Instant CREATED_AT = Instant.parse("2026-01-01T00:00:00Z");

    @BeforeAll
    static void migrateToTheEveOfTheRetirementThenApplyIt() {
        POSTGRES.start();
        DriverManagerDataSource source = new DriverManagerDataSource();
        source.setUrl(POSTGRES.getJdbcUrl());
        source.setUsername(POSTGRES.getUsername());
        source.setPassword(POSTGRES.getPassword());
        dataSource = source;
        jdbc = new JdbcTemplate(dataSource);

        flywayTo("47").migrate();

        seedLegacy(PUBLISHED_TO_A_PRIVATE_AUDIENCE, "Palawan, quietly", true, "PRIVATE");
        seedLegacy(ALSO_PUBLISHED_TO_A_PRIVATE_AUDIENCE, "Sagada, quietly", true, "PRIVATE");
        seedLegacy(PUBLISHED_PUBLICLY, "Siargao, loudly", true, "PUBLIC");
        seedLegacy(NEVER_PUBLISHED_AND_PRIVATE, "Someday, Japan", false, "PRIVATE");

        flywayTo("48").migrate();
    }


    @Test
    void everyTripPublishedToAPrivateAudienceIsUnpublished() {
        assertThat(publishedFlagOf(PUBLISHED_TO_A_PRIVATE_AUDIENCE))
                .as("dropping the column without this would WIDEN a restricted trip to everyone")
                .isFalse();
        assertThat(publishedFlagOf(ALSO_PUBLISHED_TO_A_PRIVATE_AUDIENCE)).isFalse();
    }


    @Test
    void aPubliclyPublishedTripIsUntouched() {
        assertThat(publishedFlagOf(PUBLISHED_PUBLICLY))
                .as("its audience was already everyone, so the retirement changes nothing for it")
                .isTrue();
    }


    @Test
    void aTripThatWasNeverPublishedIsUntouched() {
        assertThat(publishedFlagOf(NEVER_PUBLISHED_AND_PRIVATE))
                .as("the statement is scoped to published rows; an unpublished one has no audience")
                .isFalse();
    }


    @Test
    void theUnpublishIsTheOneTheOwnerPerforms_soPublishedAtAndStateAreLeftStanding() {
        assertThat(publishedAtOf(PUBLISHED_TO_A_PRIVATE_AUDIENCE))
                .as("published_at records when it was LAST published, which is still true")
                .isEqualTo(PUBLISHED_AT);
        assertThat(stateOf(PUBLISHED_TO_A_PRIVATE_AUDIENCE))
                .as("unpublishing is not a lifecycle rewind — the axes stay independent")
                .isEqualTo("COMPLETED");
    }


    @Test
    void theColumnIsGone() {
        assertThat(columnCount("visibility"))
                .as("the last place the word private meant something about a trip")
                .isZero();
        assertThat(columnCount("published")).isEqualTo(1);
    }


    private static boolean publishedFlagOf(UUID itineraryId) {
        return Boolean.TRUE.equals(
                jdbc.queryForObject(
                        "SELECT published FROM itinerary WHERE id = ?", Boolean.class, itineraryId));
    }


    private static Instant publishedAtOf(UUID itineraryId) {
        Timestamp stamped =
                jdbc.queryForObject(
                        "SELECT published_at FROM itinerary WHERE id = ?", Timestamp.class, itineraryId);
        return stamped == null ? null : stamped.toInstant();
    }


    private static String stateOf(UUID itineraryId) {
        return jdbc.queryForObject(
                "SELECT state FROM itinerary WHERE id = ?", String.class, itineraryId);
    }


    private static int columnCount(String column) {
        return jdbc.queryForObject(
                "SELECT count(*) FROM information_schema.columns "
                        + "WHERE table_name = 'itinerary' AND column_name = ?",
                Integer.class,
                column);
    }


    private static void seedLegacy(UUID id, String title, boolean published, String visibility) {
        jdbc.update(
                "INSERT INTO itinerary (id, owner_id, title, destination, standouts, state, visibility, "
                        + "published, published_at, created_at, completed_at) "
                        + "VALUES (?, ?, ?, ?, ?, 'COMPLETED', ?, ?, ?, ?, ?)",
                id,
                ANA,
                title,
                "somewhere",
                new String[] {},
                visibility,
                published,
                published ? Timestamp.from(PUBLISHED_AT) : null,
                Timestamp.from(CREATED_AT),
                Timestamp.from(PUBLISHED_AT));
    }


    private static Flyway flywayTo(String version) {
        return Flyway.configure()
                .dataSource(dataSource)
                .locations("classpath:db/migration")
                .target(version)
                .cleanDisabled(false)
                .load();
    }
}
