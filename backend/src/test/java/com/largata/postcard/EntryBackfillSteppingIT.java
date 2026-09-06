package com.largata.postcard;

import static org.assertj.core.api.Assertions.assertThat;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.postgresql.PostgreSQLContainer;


class EntryBackfillSteppingIT {

    private static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");

    private static JdbcTemplate jdbc;

    private static final UUID AUTHOR = UUID.randomUUID();
    private static final UUID OTHER_AUTHOR = UUID.randomUUID();
    private static final UUID TRIP = UUID.randomUUID();
    private static final UUID GONE_TRIP = UUID.randomUUID();

    private static final UUID DAY_ONE = UUID.randomUUID();
    private static final UUID DAY_TWO = UUID.randomUUID();
    private static final UUID ACTIVITY_ON_DAY_ONE = UUID.randomUUID();
    private static final UUID ACTIVITY_ON_DAY_TWO = UUID.randomUUID();

    private static final UUID ENTRY_WITH_ACTIVITY = UUID.randomUUID();
    private static final UUID ENTRY_SAME_DAY = UUID.randomUUID();
    private static final UUID ENTRY_DAY_TWO = UUID.randomUUID();
    private static final UUID ENTRY_DANGLING = UUID.randomUUID();
    private static final UUID ENTRY_OF_A_GONE_TRIP = UUID.randomUUID();
    private static final UUID ENTRY_OF_THE_OTHER_AUTHOR = UUID.randomUUID();

    private static final UUID PHOTO_ON_AN_ENTRY = UUID.randomUUID();
    private static final UUID PHOTO_ON_A_DUMP = UUID.randomUUID();

    private static final Instant POSTED_AT = Instant.parse("2026-03-16T09:30:00Z");

    @BeforeAll
    static void seedTheLegacyShapeThenMigrate() {
        POSTGRES.start();
        DriverManagerDataSource source = new DriverManagerDataSource();
        source.setUrl(POSTGRES.getJdbcUrl());
        source.setUsername(POSTGRES.getUsername());
        source.setPassword(POSTGRES.getPassword());
        jdbc = new JdbcTemplate(source);

        Flyway.configure()
                .dataSource(source)
                .locations("classpath:db/migration")
                .target("53")
                .cleanDisabled(false)
                .load()
                .migrate();

        traveler(AUTHOR, "The author");
        traveler(OTHER_AUTHOR, "Another traveler");
        trip(TRIP, "Palawan by boat", "Palawan", LocalDate.of(2026, 3, 15), LocalDate.of(2026, 3, 19));

        day(DAY_ONE, TRIP, 1, "Arrival");
        day(DAY_TWO, TRIP, 2, null);
        activity(ACTIVITY_ON_DAY_ONE, DAY_ONE, "Sunset sail");
        activity(ACTIVITY_ON_DAY_TWO, DAY_TWO, "Island hop");

        entry(ENTRY_WITH_ACTIVITY, AUTHOR, TRIP, ACTIVITY_ON_DAY_ONE, "Sunset sail", "Day 1: Arrival",
                "El Nido", "What a start", POSTED_AT);
        entry(ENTRY_SAME_DAY, AUTHOR, TRIP, null, "A second moment", "Day 1: Arrival",
                null, "Again, same day", POSTED_AT.plusSeconds(60));
        entry(ENTRY_DAY_TWO, AUTHOR, TRIP, ACTIVITY_ON_DAY_TWO, "Island hop", "Day 2",
                "Coron", "The second day", POSTED_AT.plusSeconds(120));
        entry(ENTRY_DANGLING, AUTHOR, TRIP, null, "A deleted activity", "Day 2: Whatever",
                null, "The activity is gone", POSTED_AT.plusSeconds(180));
        entry(ENTRY_OF_A_GONE_TRIP, AUTHOR, GONE_TRIP, null, "Long ago", "Day 1",
                null, "The trip is gone", POSTED_AT.plusSeconds(240));
        entry(ENTRY_OF_THE_OTHER_AUTHOR, OTHER_AUTHOR, TRIP, ACTIVITY_ON_DAY_ONE, "Sunset sail",
                "Day 1: Arrival", null, "Mine, not theirs", POSTED_AT.plusSeconds(300));

        photo(PHOTO_ON_AN_ENTRY, "DIARY_ENTRY", ENTRY_WITH_ACTIVITY);
        photo(PHOTO_ON_A_DUMP, "ITINERARY_PHOTO_DUMP", TRIP);

        Flyway.configure()
                .dataSource(source)
                .locations("classpath:db/migration")
                .target("54")
                .cleanDisabled(false)
                .load()
                .migrate();
    }


    @Test
    void everyEntryBecomesAPostcardKeepingItsOwnId() {
        assertThat(
                        jdbc.queryForList(
                                "SELECT id FROM postcard ORDER BY created_at", UUID.class))
                .as("ids are preserved so photo keys and shared links keep resolving")
                .containsExactly(
                        ENTRY_WITH_ACTIVITY,
                        ENTRY_SAME_DAY,
                        ENTRY_DAY_TWO,
                        ENTRY_DANGLING,
                        ENTRY_OF_A_GONE_TRIP,
                        ENTRY_OF_THE_OTHER_AUTHOR);
    }


    @Test
    void aPostcardKeepsItsAuthorSnapshotAndTimestamps() {
        Map<String, Object> row =
                jdbc.queryForMap("SELECT * FROM postcard WHERE id = ?", ENTRY_WITH_ACTIVITY);

        assertThat(row.get("author_id")).isEqualTo(AUTHOR);
        assertThat(row.get("trip_id")).isEqualTo(TRIP);
        assertThat(row.get("activity_id")).isEqualTo(ACTIVITY_ON_DAY_ONE);
        assertThat(row.get("activity_title")).isEqualTo("Sunset sail");
        assertThat(row.get("day_label")).isEqualTo("Day 1: Arrival");
        assertThat(row.get("place")).isEqualTo("El Nido");
        assertThat(row.get("caption")).isEqualTo("What a start");
        assertThat(((Timestamp) row.get("created_at")).toInstant()).isEqualTo(POSTED_AT);
    }


    @Test
    void aDanglingActivityReferenceSurvivesTheMove() {
        assertThat(
                        jdbc.queryForObject(
                                "SELECT count(*) FROM postcard WHERE id = ? AND activity_id IS NULL",
                                Integer.class,
                                ENTRY_DANGLING))
                .as("provenance without a foreign key: the snapshot is what renders")
                .isEqualTo(1);
    }


    @Test
    void oneDiaryIsMintedPerAuthorPerTripWithTheTripsFields() {
        assertThat(jdbc.queryForObject("SELECT count(*) FROM diary", Integer.class))
                .as("two authors on one trip, plus the author's vanished trip")
                .isEqualTo(3);

        Map<String, Object> row =
                jdbc.queryForMap(
                        "SELECT * FROM diary WHERE author_id = ? AND trip_id = ?", AUTHOR, TRIP);
        assertThat(row.get("title")).isEqualTo("Palawan by boat");
        assertThat(row.get("destination")).isEqualTo("Palawan");
        assertThat(row.get("start_date")).isEqualTo(java.sql.Date.valueOf("2026-03-15"));
        assertThat(row.get("end_date")).isEqualTo(java.sql.Date.valueOf("2026-03-19"));
    }


    @Test
    void anEntryOfADestroyedTripStillBecomesADiaryOfItsOwn() {
        Map<String, Object> row =
                jdbc.queryForMap(
                        "SELECT * FROM diary WHERE author_id = ? AND trip_id = ?", AUTHOR, GONE_TRIP);

        assertThat(row.get("title"))
                .as("a member's content outlives the owner's destruction, with a placeholder title")
                .isEqualTo("A trip");
        assertThat(row.get("destination")).isNull();
        assertThat(
                        jdbc.queryForObject(
                                "SELECT count(*) FROM postcard WHERE id = ? AND diary_id = ?",
                                Integer.class,
                                ENTRY_OF_A_GONE_TRIP,
                                row.get("id")))
                .isEqualTo(1);
    }


    @Test
    void oneDayIsMintedPerDistinctTripDayAndTheActivityWins() {
        UUID diary =
                jdbc.queryForObject(
                        "SELECT id FROM diary WHERE author_id = ? AND trip_id = ?",
                        UUID.class,
                        AUTHOR,
                        TRIP);

        assertThat(
                        jdbc.queryForList(
                                "SELECT ordinal FROM diary_day WHERE diary_id = ? ORDER BY ordinal",
                                Integer.class,
                                diary))
                .as("two entries on day 1 share one day; the dangling entry joins day 2 by its label")
                .containsExactly(1, 2);
        assertThat(
                        jdbc.queryForObject(
                                "SELECT trip_day_id FROM diary_day WHERE diary_id = ? AND ordinal = 1",
                                UUID.class,
                                diary))
                .as("the day snapshots the trip day it came from where the activity survives")
                .isEqualTo(DAY_ONE);
        assertThat(
                        jdbc.queryForObject(
                                "SELECT date FROM diary_day WHERE diary_id = ? AND ordinal = 2",
                                java.sql.Date.class,
                                diary))
                .isEqualTo(java.sql.Date.valueOf("2026-03-16"));
    }


    @Test
    void anEntryWhoseActivityIsGoneLandsOnTheDayItsOwnLabelNames() {
        UUID diary =
                jdbc.queryForObject(
                        "SELECT id FROM diary WHERE author_id = ? AND trip_id = ?",
                        UUID.class,
                        AUTHOR,
                        TRIP);
        UUID dayTwo =
                jdbc.queryForObject(
                        "SELECT id FROM diary_day WHERE diary_id = ? AND ordinal = 2",
                        UUID.class,
                        diary);

        assertThat(
                        jdbc.queryForObject(
                                "SELECT diary_day_id FROM postcard WHERE id = ?",
                                UUID.class,
                                ENTRY_DANGLING))
                .as("the snapshotted \"Day 2: Whatever\" label is the only surviving evidence")
                .isEqualTo(dayTwo);
    }


    @Test
    void everyPostcardLandsOnADay() {
        assertThat(
                        jdbc.queryForObject(
                                "SELECT count(*) FROM postcard WHERE diary_day_id IS NULL",
                                Integer.class))
                .as("a postcard with no day would be invisible on the new profile")
                .isZero();
    }


    @Test
    void theTwoAuthorsOnOneTripGetOneDiaryEach() {
        assertThat(
                        jdbc.queryForObject(
                                "SELECT count(DISTINCT diary_id) FROM postcard WHERE trip_id = ?",
                                Integer.class,
                                TRIP))
                .isEqualTo(2);
    }


    @Test
    void entryPhotosRePointToThePostcardAndNothingElseMoves() {
        assertThat(
                        jdbc.queryForObject(
                                "SELECT subject_kind FROM photo WHERE id = ?",
                                String.class,
                                PHOTO_ON_AN_ENTRY))
                .as("the media seam keeps serving the same photo id under the new subject")
                .isEqualTo("POSTCARD");
        assertThat(
                        jdbc.queryForObject(
                                "SELECT subject_id FROM photo WHERE id = ?",
                                UUID.class,
                                PHOTO_ON_AN_ENTRY))
                .isEqualTo(ENTRY_WITH_ACTIVITY);
        assertThat(
                        jdbc.queryForObject(
                                "SELECT subject_kind FROM photo WHERE id = ?",
                                String.class,
                                PHOTO_ON_A_DUMP))
                .as("a dump photo is not an entry photo and must not move")
                .isEqualTo("ITINERARY_PHOTO_DUMP");
    }


    @Test
    void theOldTableIsLeftIntactAsSourceMaterial() {
        assertThat(jdbc.queryForObject("SELECT count(*) FROM diary_entry", Integer.class))
                .as("the backfill reads the old rows and never destroys them; deletion is parked")
                .isEqualTo(6);
    }


    private static void traveler(UUID id, String name) {
        jdbc.update(
                "INSERT INTO traveler (id, firebase_uid, email, display_name, created_at)"
                        + " VALUES (?, ?, ?, ?, now())",
                id,
                "uid-" + id,
                id + "@example.com",
                name);
    }


    private static void trip(
            UUID id, String title, String destination, LocalDate start, LocalDate end) {
        jdbc.update(
                "INSERT INTO itinerary (id, owner_id, title, destination, standouts, start_date,"
                        + " end_date, state, published, created_at)"
                        + " VALUES (?, ?, ?, ?, '{}', ?, ?, 'COMPLETED', FALSE, now())",
                id,
                AUTHOR,
                title,
                destination,
                start,
                end);
    }


    private static void day(UUID id, UUID tripId, int ordinal, String title) {
        jdbc.update(
                "INSERT INTO day (id, itinerary_id, ordinal, title, created_at)"
                        + " VALUES (?, ?, ?, ?, now())",
                id,
                tripId,
                ordinal,
                title);
    }


    private static void activity(UUID id, UUID dayId, String title) {
        jdbc.update(
                "INSERT INTO activity (id, day_id, sort_order, title, last_edited_by,"
                        + " last_edited_at, created_at)"
                        + " VALUES (?, ?, 1, ?, ?, now(), now())",
                id,
                dayId,
                title,
                AUTHOR);
    }


    private static void entry(
            UUID id,
            UUID authorId,
            UUID tripId,
            UUID activityId,
            String activityTitle,
            String dayLabel,
            String place,
            String caption,
            Instant at) {
        jdbc.update(
                "INSERT INTO diary_entry (id, traveler_id, itinerary_id, activity_id, activity_title,"
                        + " day_label, place, caption, shared_at, created_at, updated_at)"
                        + " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                id,
                authorId,
                tripId,
                activityId,
                activityTitle,
                dayLabel,
                place,
                caption,
                Timestamp.from(at),
                Timestamp.from(at),
                Timestamp.from(at));
    }


    private static void photo(UUID id, String subjectKind, UUID subjectId) {
        jdbc.update(
                "INSERT INTO photo (id, subject_kind, subject_id, storage_key, content_type,"
                        + " width, height, byte_size, uploaded_by, created_at)"
                        + " VALUES (?, ?, ?, ?, 'image/jpeg', 100, 100, 1000, ?, now())",
                id,
                subjectKind,
                subjectId,
                "photos/" + id,
                AUTHOR);
    }


    @Test
    void theSeedItselfIsCoherent() {
        assertThat(List.of(ENTRY_WITH_ACTIVITY, ENTRY_SAME_DAY, ENTRY_DAY_TWO))
                .as("the anti-vacuity guard: distinct fixtures, or the assertions above prove nothing")
                .doesNotHaveDuplicates();
    }
}
