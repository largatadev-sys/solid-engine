package com.largata.ws;

import static org.assertj.core.api.Assertions.assertThat;

import com.largata.support.PostgresTestBase;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.scheduling.config.ScheduledTask;
import org.springframework.scheduling.config.ScheduledTaskHolder;

@SpringBootTest
class HeartbeatSchedulingIT extends PostgresTestBase {

    @Autowired private ScheduledTaskHolder scheduledTasks;

    @Test
    void theHeartbeatAndTicketSweepAreActuallyScheduled() {
        assertThat(taskDescriptions())
                .as("A heartbeat that never fires looks exactly like one that does: the sockets stay"
                        + " open and nothing goes red. This asserts the scheduler registered both"
                        + " tasks, which is the only cheap signal that @EnableScheduling is on and"
                        + " the SpEL rate expressions resolved.")
                .anyMatch(description -> description.contains("pingEverySession"))
                .anyMatch(description -> description.contains("sweepExpiredTickets"));
    }

    private java.util.List<String> taskDescriptions() {
        return scheduledTasks.getScheduledTasks().stream()
                .map(ScheduledTask::toString)
                .toList();
    }
}
