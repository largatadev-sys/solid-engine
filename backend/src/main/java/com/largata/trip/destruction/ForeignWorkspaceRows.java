package com.largata.trip.destruction;

import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;


@Component
class ForeignWorkspaceRows {

    private static final List<String> HANGING_OFF_THE_WORKSPACE =
            List.of("poll", "invitation", "join_request", "join_link");

    private final JdbcClient db;

    ForeignWorkspaceRows(JdbcClient db) {
        this.db = db;
    }


    @Transactional(propagation = Propagation.MANDATORY)
    void deleteChatOf(UUID tripId) {
        db.sql("DELETE FROM chat_message WHERE itinerary_id = ?").param(tripId).update();
    }


    @Transactional(propagation = Propagation.MANDATORY)
    void deleteEverythingHangingOff(UUID workspaceId) {
        for (String table : HANGING_OFF_THE_WORKSPACE) {
            db.sql("DELETE FROM " + table + " WHERE workspace_id = ?").param(workspaceId).update();
        }
    }
}
