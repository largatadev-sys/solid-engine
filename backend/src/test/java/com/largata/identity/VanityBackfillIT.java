package com.largata.identity;

import static org.assertj.core.api.Assertions.assertThat;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.postgresql.PostgreSQLContainer;


class VanityBackfillIT {

    private static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");

    private static DataSource dataSource;
    private static JdbcTemplate jdbc;

    private static final UUID ANA = UUID.randomUUID();
    private static final UUID BEN = UUID.randomUUID();
    private static final UUID CARLA = UUID.randomUUID();

    private static final UUID FOUNDER = UUID.fromString("00000000-0000-0000-0000-000000000000");
    private static final UUID SHORT_HANDLE_HOLDER = UUID.randomUUID();

    private static final Instant ANAS_SIGNUP = Instant.parse("2026-03-01T09:15:30Z").truncatedTo(ChronoUnit.MICROS);
    private static final Instant BENS_SIGNUP = Instant.parse("2026-05-20T18:45:00Z").truncatedTo(ChronoUnit.MICROS);
    private static final Instant CARLAS_SIGNUP = Instant.parse("2026-06-11T04:00:01Z").truncatedTo(ChronoUnit.MICROS);
    private static final Instant FOUNDERS_SIGNUP = Instant.parse("2026-01-02T08:00:00Z").truncatedTo(ChronoUnit.MICROS);


    @BeforeAll
    static void migrateToTheEveOfTheBackfillThenApplyIt() {
        POSTGRES.start();
        DriverManagerDataSource source = new DriverManagerDataSource();
        source.setUrl(POSTGRES.getJdbcUrl());
        source.setUsername(POSTGRES.getUsername());
        source.setPassword(POSTGRES.getPassword());
        dataSource = source;
        jdbc = new JdbcTemplate(dataSource);

        flywayTo("24").migrate();

        seedLegacyTraveler(ANA, "Ana Silva", ANAS_SIGNUP);
        seedLegacyTraveler(BEN, "Ben Ortega", BENS_SIGNUP);
        seedLegacyTraveler(CARLA, "Carla Reyes", CARLAS_SIGNUP);
        seedLegacyTraveler(FOUNDER, "Founder", FOUNDERS_SIGNUP);
        seedLegacyTraveler(SHORT_HANDLE_HOLDER, "Short Handle", FOUNDERS_SIGNUP);
        jdbc.update("UPDATE traveler SET handle = 'ea' WHERE id = ?", SHORT_HANDLE_HOLDER);

        assertThat(count("SELECT count(*) FROM traveler WHERE vanity_cohort IS NULL"))
                .as("the fixture is the legacy shape: nobody has a number yet")
                .isEqualTo(5);

        flywayTo("25").migrate();
    }


    @Test
    void everyLegacyTravelerLeavesWithANumber() {
        assertThat(count("SELECT count(*) FROM traveler WHERE vanity_cohort IS NULL"))
                .as("the window V24 opened is closed")
                .isZero();
    }


    @Test
    void everyNonFounderLandsInTheBetaCohort() {
        assertThat(cohortOf(ANA)).isEqualTo(1);
        assertThat(cohortOf(BEN)).isEqualTo(1);
        assertThat(cohortOf(CARLA)).isEqualTo(1);
    }


    @Test
    void noTravelerIsGrantedFounderZeroYet() {
        assertThat(count("SELECT count(*) FROM traveler WHERE vanity_cohort = 0"))
                .as("the founder list is deliberately empty at S4.14 - the grant is its own follow-up "
                        + "migration, so a traveler appearing here means literals landed unreviewed")
                .isZero();
        assertThat(cohortOf(FOUNDER))
                .as("the future founder holds an ordinary beta number until that migration lands")
                .isEqualTo(1);
    }


    @Test
    void aFounderShapedRowSurvivesTheBackfillAndKeepsItsShortHandle() {
        assertThat(handleOf(SHORT_HANDLE_HOLDER))
                .as("the planting mechanism the follow-up will use: 2 characters, below "
                        + "Handle.MIN_LENGTH, written as data and untouched by any migration")
                .isEqualTo("ea");
        assertThat(cohortOf(SHORT_HANDLE_HOLDER))
                .as("a short handle does not exempt a row from the ordinary backfill")
                .isEqualTo(1);
    }


    @Test
    void noTwoTravelersLeaveWithTheSameNumber() {
        List<Integer> drawn =
                jdbc.queryForList(
                        "SELECT vanity_pool_number FROM traveler WHERE vanity_cohort = 1", Integer.class);

        assertThat(drawn).doesNotHaveDuplicates();
    }


    @Test
    void everyBackfilledNumberIsMarkedClaimedInThePool() {
        assertThat(
                        count(
                                "SELECT count(*) FROM traveler t JOIN vanity_pool p "
                                        + "ON p.cohort = t.vanity_cohort AND p.pool_number = t.vanity_pool_number "
                                        + "WHERE t.vanity_cohort = 1 AND p.claimed_at IS NULL"))
                .as("an unmarked row would be handed out a second time to the next sign-up - the "
                        + "collision the single-allocation-path decision exists to prevent")
                .isZero();
    }


    @Test
    void theMonthOnePoolExistsWholeSoLaterSignUpsDrawFromIt() {
        assertThat(count("SELECT count(*) FROM vanity_pool WHERE cohort = 1")).isEqualTo(10_000);
        assertThat(count("SELECT count(*) FROM vanity_pool WHERE cohort = 1 AND claimed_at IS NULL"))
                .as("five travelers drew, and every draw is marked - an unmarked row would be issued "
                        + "a second time to the next sign-up")
                .isEqualTo(9_995);
    }


    @Test
    void reRunningTheBackfillChangesNothing() {
        int numbered = count("SELECT count(*) FROM traveler WHERE vanity_cohort IS NOT NULL");
        int claimed = count("SELECT count(*) FROM vanity_pool WHERE claimed_at IS NOT NULL");
        int anasNumber = poolNumberOf(ANA);

        jdbc.execute(backfillSql());

        assertThat(count("SELECT count(*) FROM traveler WHERE vanity_cohort IS NOT NULL")).isEqualTo(numbered);
        assertThat(count("SELECT count(*) FROM vanity_pool WHERE claimed_at IS NOT NULL")).isEqualTo(claimed);
        assertThat(poolNumberOf(ANA)).as("an immutable number does not move on a re-run").isEqualTo(anasNumber);
    }


    private static String backfillSql() {
        try (var in = VanityBackfillIT.class.getResourceAsStream("/db/migration/V25__backfill_vanity_numbers.sql")) {
            return new String(in.readAllBytes(), java.nio.charset.StandardCharsets.UTF_8);
        } catch (java.io.IOException e) {
            throw new IllegalStateException("V25 must be readable from the classpath", e);
        }
    }

    private static Flyway flywayTo(String version) {
        return Flyway.configure()
                .dataSource(dataSource)
                .locations("classpath:db/migration")
                .target(version)
                .cleanDisabled(false)
                .load();
    }

    private static void seedLegacyTraveler(UUID id, String displayName, Instant createdAt) {
        jdbc.update(
                "INSERT INTO traveler (id, firebase_uid, email, display_name, created_at) "
                        + "VALUES (?, ?, ?, ?, ?)",
                id,
                "uid-" + id,
                id + "@example.com",
                displayName,
                Timestamp.from(createdAt));
    }

    private static int count(String sql) {
        return jdbc.queryForObject(sql, Integer.class);
    }

    private int cohortOf(UUID travelerId) {
        return jdbc.queryForObject("SELECT vanity_cohort FROM traveler WHERE id = ?", Integer.class, travelerId);
    }

    private int poolNumberOf(UUID travelerId) {
        return jdbc.queryForObject(
                "SELECT vanity_pool_number FROM traveler WHERE id = ?", Integer.class, travelerId);
    }

    private String handleOf(UUID travelerId) {
        return jdbc.queryForObject("SELECT handle FROM traveler WHERE id = ?", String.class, travelerId);
    }
}
