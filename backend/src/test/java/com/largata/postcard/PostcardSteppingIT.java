package com.largata.postcard;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatExceptionOfType;

import java.sql.Timestamp;
import java.time.Instant;
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


class PostcardSteppingIT {

    private static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");

    private static JdbcTemplate jdbc;

    private static final UUID AUTHOR = UUID.randomUUID();
    private static final UUID DIARY = UUID.randomUUID();
    private static final UUID ACTIVITY = UUID.randomUUID();

    @BeforeAll
    static void migrateToTheEveThenApply() {
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
                .target("45")
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
                "INSERT INTO diary (id, author_id, title, created_at, updated_at)"
                        + " VALUES (?, ?, 'Stepping diary', now(), now())",
                DIARY,
                AUTHOR);

        Flyway.configure()
                .dataSource(dataSource)
                .locations("classpath:db/migration")
                .target("46")
                .cleanDisabled(false)
                .load()
                .migrate();
    }


    @Test
    void theDiaryReferenceIsARealForeignKey() {
        assertThatExceptionOfType(DataIntegrityViolationException.class)
                .as("a postcard cannot claim a diary that does not exist — the containment is structural")
                .isThrownBy(() -> insertPostcard(UUID.randomUUID(), UUID.randomUUID(), null));

        insertPostcard(UUID.randomUUID(), DIARY, null);
    }


    @Test
    void oneAuthorPostsAtMostOnePostcardPerActivity() {
        insertPostcard(UUID.randomUUID(), null, ACTIVITY);

        assertThatExceptionOfType(DuplicateKeyException.class)
                .as("a double-submit race cannot mint two postcards from one activity")
                .isThrownBy(() -> insertPostcard(UUID.randomUUID(), null, ACTIVITY));
    }


    @Test
    void loosePostcardsAreUnlimited() {
        insertPostcard(UUID.randomUUID(), null, null);
        insertPostcard(UUID.randomUUID(), null, null);

        assertThat(
                        jdbc.queryForObject(
                                "SELECT count(*) FROM postcard WHERE activity_id IS NULL"
                                        + " AND diary_id IS NULL",
                                Integer.class))
                .isGreaterThanOrEqualTo(2);
    }


    @Test
    void theProvenanceReferencesCarryNoForeignKeys() {
        assertThat(
                        jdbc.queryForObject(
                                "SELECT count(*) FROM information_schema.table_constraints"
                                        + " WHERE table_name = 'postcard'"
                                        + " AND constraint_type = 'FOREIGN KEY'"
                                        + " AND (constraint_name LIKE '%trip%'"
                                        + " OR constraint_name LIKE '%activity%')",
                                Integer.class))
                .as("a postcard survives its trip's destruction and its activity's deletion by structure")
                .isZero();
    }


    private static void insertPostcard(UUID id, UUID diaryId, UUID activityId) {
        jdbc.update(
                "INSERT INTO postcard (id, author_id, diary_id, activity_id, created_at, updated_at)"
                        + " VALUES (?, ?, ?, ?, ?, ?)",
                id,
                AUTHOR,
                diaryId,
                activityId,
                Timestamp.from(Instant.now()),
                Timestamp.from(Instant.now()));
    }
}
