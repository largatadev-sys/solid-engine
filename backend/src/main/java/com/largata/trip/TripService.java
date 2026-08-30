package com.largata.trip;

import com.largata.common.authz.Membership;
import com.largata.trip.TripExceptions.TripNotFoundException;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;
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
    public boolean frozen(UUID tripId) {
        return db.sql("SELECT state FROM workspace WHERE itinerary_id = ?")
                .param(tripId)
                .query(String.class)
                .optional()
                .map("ARCHIVED"::equals)
                .orElse(false);
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
