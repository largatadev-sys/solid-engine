package com.largata.trip;

import com.largata.common.authz.Membership;
import com.largata.trip.TripExceptions.TripNotFoundException;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;


@Service
public class TripService {

    private final JdbcClient db;

    TripService(JdbcClient db) {
        this.db = db;
    }


    @Transactional(readOnly = true)
    public TripFacts read(Membership member) {
        TripFacts facts = factsOf(member.itineraryId()).orElseThrow(TripNotFoundException::new);
        if (facts.archived() && !member.isOwner()) {
            throw new TripNotFoundException();
        }
        return facts;
    }


    @Transactional(readOnly = true)
    public Optional<TripFacts> factsOf(UUID tripId) {
        return db.sql(
                        "SELECT i.id, i.owner_id, i.title, i.destination, i.start_date, i.end_date,"
                                + " i.state, i.published, i.created_at, w.state AS workspace_state"
                                + " FROM itinerary i"
                                + " LEFT JOIN workspace w ON w.itinerary_id = i.id"
                                + " WHERE i.id = ?")
                .param(tripId)
                .query(TripService::factsRow)
                .optional();
    }


    @Transactional(readOnly = true)
    public Optional<TripPlan> planOf(UUID tripId) {
        return db.sql(
                        "SELECT id, owner_id, title, destination, description, currency, standouts,"
                                + " best_time_of_year, cover_image_url, start_date, end_date, state,"
                                + " published FROM itinerary WHERE id = ?")
                .param(tripId)
                .query(TripService::headerRow)
                .optional()
                .map(header -> header.withDays(daysOf(tripId)));
    }


    @Transactional
    public void markPublished(UUID tripId, boolean visibleToEveryone, Instant at) {
        db.sql(
                        "UPDATE itinerary SET published = TRUE, visibility = ?, published_at = ?"
                                + " WHERE id = ?")
                .param(visibleToEveryone ? "PUBLIC" : "PRIVATE")
                .param(java.sql.Timestamp.from(at))
                .param(tripId)
                .update();
    }


    @Transactional
    public void markUnpublished(UUID tripId) {
        db.sql("UPDATE itinerary SET published = FALSE WHERE id = ?").param(tripId).update();
    }


    @Transactional(readOnly = true)
    public Optional<ActivityFacts> activityFactsOf(UUID tripId, UUID activityId) {
        if (activityId == null) {
            return Optional.empty();
        }
        return db.sql(
                        "SELECT a.id, a.title, a.time_of_day, a.place, d.ordinal, d.title AS day_title"
                                + " FROM activity a JOIN day d ON d.id = a.day_id"
                                + " WHERE a.id = ? AND d.itinerary_id = ?")
                .param(activityId)
                .param(tripId)
                .query(TripService::activityFactsRow)
                .optional();
    }


    private static ActivityFacts activityFactsRow(ResultSet row, int rowNumber) throws SQLException {
        return new ActivityFacts(
                row.getObject("id", UUID.class),
                row.getString("title"),
                dayLabelOf(row.getInt("ordinal"), row.getString("day_title")),
                row.getObject("time_of_day", LocalTime.class),
                row.getString("place"));
    }


    private static String dayLabelOf(int ordinal, String dayTitle) {
        String prefix = "Day " + ordinal;
        return dayTitle == null || dayTitle.isBlank() ? prefix : prefix + ": " + dayTitle.strip();
    }


    @Transactional(readOnly = true)
    public boolean frozen(UUID tripId) {
        return db.sql("SELECT state FROM workspace WHERE itinerary_id = ?")
                .param(tripId)
                .query(String.class)
                .optional()
                .map("ARCHIVED"::equals)
                .orElse(false);
    }


    private record PlanHeader(TripPlan headerOnly) {

        TripPlan withDays(List<TripPlan.PlanDay> days) {
            return new TripPlan(
                    headerOnly.id(),
                    headerOnly.ownerId(),
                    headerOnly.title(),
                    headerOnly.destination(),
                    headerOnly.description(),
                    headerOnly.currency(),
                    headerOnly.standouts(),
                    headerOnly.bestTimeOfYear(),
                    headerOnly.coverImageUrl(),
                    headerOnly.startDate(),
                    headerOnly.endDate(),
                    headerOnly.lifecycle(),
                    headerOnly.published(),
                    days);
        }
    }


    private static PlanHeader headerRow(ResultSet row, int rowNumber) throws SQLException {
        return new PlanHeader(
                new TripPlan(
                        row.getObject("id", UUID.class),
                        row.getObject("owner_id", UUID.class),
                        row.getString("title"),
                        row.getString("destination"),
                        row.getString("description"),
                        row.getString("currency"),
                        standoutsOf(row),
                        row.getString("best_time_of_year"),
                        row.getString("cover_image_url"),
                        row.getObject("start_date", java.time.LocalDate.class),
                        row.getObject("end_date", java.time.LocalDate.class),
                        TripLifecycle.parse(row.getString("state"))
                                .orElseThrow(TripNotFoundException::new),
                        row.getBoolean("published"),
                        List.of()));
    }


    private static List<String> standoutsOf(ResultSet row) throws SQLException {
        java.sql.Array stored = row.getArray("standouts");
        return stored == null ? List.of() : List.of((String[]) stored.getArray());
    }


    private List<TripPlan.PlanDay> daysOf(UUID tripId) {
        Map<UUID, List<TripPlan.PlanActivity>> activities =
                db.sql(
                                "SELECT a.day_id, a.sort_order, a.title, a.time_of_day, a.cost_amount,"
                                        + " a.cost_currency, a.place, a.description, a.notes, a.external_url,"
                                        + " a.booking_purpose, a.booking_provider, a.booking_price_amount,"
                                        + " a.booking_price_currency"
                                        + " FROM activity a JOIN day d ON d.id = a.day_id"
                                        + " WHERE d.itinerary_id = ? ORDER BY a.day_id, a.sort_order")
                        .param(tripId)
                        .query(TripService::activityEntry)
                        .list()
                        .stream()
                        .collect(
                                Collectors.groupingBy(
                                        Map.Entry::getKey,
                                        Collectors.mapping(Map.Entry::getValue, Collectors.toList())));
        return db.sql("SELECT id, ordinal, title FROM day WHERE itinerary_id = ? ORDER BY ordinal")
                .param(tripId)
                .query(
                        (row, rowNumber) ->
                                new TripPlan.PlanDay(
                                        row.getInt("ordinal"),
                                        row.getString("title"),
                                        activities.getOrDefault(
                                                row.getObject("id", UUID.class), List.of())))
                .list();
    }


    private static Map.Entry<UUID, TripPlan.PlanActivity> activityEntry(ResultSet row, int rowNumber)
            throws SQLException {
        LocalTime timeOfDay = row.getObject("time_of_day", LocalTime.class);
        return Map.entry(
                row.getObject("day_id", UUID.class),
                new TripPlan.PlanActivity(
                        row.getInt("sort_order"),
                        row.getString("title"),
                        timeOfDay == null ? null : timeOfDay.toString(),
                        row.getBigDecimal("cost_amount"),
                        row.getString("cost_currency"),
                        row.getString("place"),
                        row.getString("description"),
                        row.getString("notes"),
                        row.getString("external_url"),
                        row.getString("booking_purpose"),
                        row.getString("booking_provider"),
                        row.getBigDecimal("booking_price_amount"),
                        row.getString("booking_price_currency")));
    }


    private static TripFacts factsRow(ResultSet row, int rowNumber) throws SQLException {
        return new TripFacts(
                row.getObject("id", UUID.class),
                row.getObject("owner_id", UUID.class),
                row.getString("title"),
                row.getString("destination"),
                row.getObject("start_date", java.time.LocalDate.class),
                row.getObject("end_date", java.time.LocalDate.class),
                TripLifecycle.parse(row.getString("state")).orElseThrow(TripNotFoundException::new),
                row.getBoolean("published"),
                "ARCHIVED".equals(row.getString("workspace_state")),
                row.getObject("created_at", OffsetDateTime.class).toInstant());
    }
}
