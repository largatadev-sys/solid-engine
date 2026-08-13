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
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.postgresql.PostgreSQLContainer;


@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class FounderVanityGrantIT {

    private static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");

    private static DataSource dataSource;
    private static JdbcTemplate jdbc;

    private static final List<String> FOUNDER_UIDS =
            List.of(
                    "b1vqxxeCxsPMtDzLq0Q0DbBK3tN2",
                    "FNJoED1l3bdtyfnEzIqFPKhNXp32",
                    "MsZFP3WkDfWBe51RjFKd1ArY7bV2",
                    "doYQwfMHC7dvUzybbcD5ps0MvdO2");

    private static final String STRANGER_UID = "uid-not-a-founder";

    private static final Instant LONG_BEFORE_LAUNCH =
            Instant.parse("2026-07-16T10:50:42Z").truncatedTo(ChronoUnit.MICROS);

    private static int strangersNumberBeforeTheGrant;


    @BeforeAll
    static void migrateToTheEveOfTheGrantThenApplyIt() {
        POSTGRES.start();
        DriverManagerDataSource source = new DriverManagerDataSource();
        source.setUrl(POSTGRES.getJdbcUrl());
        source.setUsername(POSTGRES.getUsername());
        source.setPassword(POSTGRES.getPassword());
        dataSource = source;
        jdbc = new JdbcTemplate(dataSource);

        flywayTo("24").migrate();

        for (String uid : FOUNDER_UIDS) {
            seedLegacyTraveler(uid);
        }
        seedLegacyTraveler(STRANGER_UID);

        flywayTo("30").migrate();

        assertThat(count("SELECT count(*) FROM traveler WHERE vanity_cohort = 1"))
                .as("the fixture is the shape the grant finds on the rung: five ordinary beta "
                        + "travelers, four of whom are founders holding numbers they should not")
                .isEqualTo(5);
        assertThat(count("SELECT count(*) FROM traveler WHERE vanity_cohort = 0"))
                .as("nobody holds founder zero before V31 - if anybody did, every assertion below "
                        + "could pass without the migration having done anything")
                .isZero();

        strangersNumberBeforeTheGrant = poolNumberOf(STRANGER_UID);

        flywayTo("31").migrate();
    }


    @Test
    @Order(1)
    void allFourFoundersLeaveHoldingTheLiteralZero() {
        for (String uid : FOUNDER_UIDS) {
            assertThat(cohortOf(uid)).as("cohort for " + uid).isZero();
            assertThat(poolNumberOf(uid)).as("pool number for " + uid).isZero();
        }
    }


    @Test
    @Order(2)
    void fourRowsShareZeroZeroBecauseTheUniqueIndexIsPartialOnCohortAboveZero() {
        assertThat(count("SELECT count(*) FROM traveler WHERE vanity_cohort = 0 AND vanity_pool_number = 0"))
                .as("a plain UNIQUE would have refused the second founder - traveler_vanity_idx "
                        + "carries WHERE vanity_cohort > 0 precisely so this migration can land")
                .isEqualTo(4);
    }


    @Test
    @Order(3)
    void aTravelerWhoIsNotAFounderKeepsTheNumberTheyHad() {
        assertThat(cohortOf(STRANGER_UID))
                .as("the grant is four literals, not a rule anyone else can match")
                .isEqualTo(1);
        assertThat(poolNumberOf(STRANGER_UID))
                .as("an untouched row keeps its exact draw, not merely its cohort")
                .isEqualTo(strangersNumberBeforeTheGrant);
    }


    @Test
    @Order(4)
    void theFoundersSurrenderedBetaNumbersStayClaimedForever() {
        assertThat(count("SELECT count(*) FROM vanity_pool WHERE cohort = 1 AND claimed_at IS NULL"))
                .as("five draws were made and five stay claimed - returning the founders' four to "
                        + "the pool would hand them to later sign-ups, and never recycled is absolute")
                .isEqualTo(9_995);
    }


    @Test
    @Order(5)
    void reRunningTheGrantChangesNothing() {
        jdbc.execute(grantSql());

        assertThat(count("SELECT count(*) FROM traveler WHERE vanity_cohort = 0")).isEqualTo(4);
        assertThat(poolNumberOf(STRANGER_UID)).isEqualTo(strangersNumberBeforeTheGrant);
        assertThat(count("SELECT count(*) FROM vanity_pool WHERE cohort = 1 AND claimed_at IS NULL"))
                .isEqualTo(9_995);
    }


    @Test
    @Order(6)
    void aFounderUidThatMatchesNoRowIsANoOpRatherThanAFailure() {
        jdbc.update("DELETE FROM traveler WHERE firebase_uid = ?", FOUNDER_UIDS.get(3));

        jdbc.execute(grantSql());

        assertThat(count("SELECT count(*) FROM traveler WHERE vanity_cohort = 0"))
                .as("this is the fresh-database and the production case: on a fresh rung Flyway runs "
                        + "V31 before any founder has signed in, and largata-prod mints its own uids - "
                        + "the UPDATE must touch nothing and complete, leaving the grant simply absent")
                .isEqualTo(3);
    }


    private static String grantSql() {
        try (var in =
                FounderVanityGrantIT.class.getResourceAsStream("/db/migration/V31__founder_vanity_zero.sql")) {
            return new String(in.readAllBytes(), java.nio.charset.StandardCharsets.UTF_8);
        } catch (java.io.IOException e) {
            throw new IllegalStateException("V31 must be readable from the classpath", e);
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

    private static void seedLegacyTraveler(String firebaseUid) {
        UUID id = UUID.randomUUID();
        jdbc.update(
                "INSERT INTO traveler (id, firebase_uid, email, display_name, created_at) "
                        + "VALUES (?, ?, ?, ?, ?)",
                id,
                firebaseUid,
                id + "@example.com",
                "Traveler " + id,
                Timestamp.from(LONG_BEFORE_LAUNCH));
    }

    private static int count(String sql) {
        return jdbc.queryForObject(sql, Integer.class);
    }

    private static int cohortOf(String firebaseUid) {
        return jdbc.queryForObject(
                "SELECT vanity_cohort FROM traveler WHERE firebase_uid = ?", Integer.class, firebaseUid);
    }

    private static int poolNumberOf(String firebaseUid) {
        return jdbc.queryForObject(
                "SELECT vanity_pool_number FROM traveler WHERE firebase_uid = ?", Integer.class, firebaseUid);
    }
}
