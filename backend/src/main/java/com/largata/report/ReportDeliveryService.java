package com.largata.report;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import org.springframework.data.domain.Limit;
import org.springframework.stereotype.Service;


@Service
public class ReportDeliveryService {

    static final int BATCH = 25;

    private final ReportOutboxRepository outbox;
    private final ReportDeliveryAttempt attempt;
    private final Clock clock;

    ReportDeliveryService(
            ReportOutboxRepository outbox, ReportDeliveryAttempt attempt, Clock clock) {
        this.outbox = outbox;
        this.attempt = attempt;
        this.clock = clock;
    }


    public int drainDueReports() {
        List<ReportOutboxEntry> due =
                outbox.findByStatusAndNextAttemptAtLessThanEqualOrderByNextAttemptAtAsc(
                        ReportStatus.PENDING, Instant.now(clock), Limit.of(BATCH));
        int delivered = 0;
        for (ReportOutboxEntry entry : due) {
            if (attempt.deliver(entry.id())) {
                delivered++;
            }
        }
        return delivered;
    }
}
