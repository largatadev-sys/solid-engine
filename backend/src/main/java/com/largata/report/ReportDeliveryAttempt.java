package com.largata.report;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;


@Component
class ReportDeliveryAttempt {

    private static final Logger log = LoggerFactory.getLogger(ReportDeliveryAttempt.class);

    private final ReportOutboxRepository outbox;
    private final ReportScreenshotRepository screenshots;
    private final ReportRelay relay;
    private final Clock clock;

    ReportDeliveryAttempt(
            ReportOutboxRepository outbox,
            ReportScreenshotRepository screenshots,
            ReportRelay relay,
            Clock clock) {
        this.outbox = outbox;
        this.screenshots = screenshots;
        this.relay = relay;
        this.clock = clock;
    }


    @Transactional(propagation = Propagation.REQUIRES_NEW)
    boolean deliver(UUID reportId) {
        ReportOutboxEntry entry = outbox.findById(reportId).orElse(null);
        if (entry == null || entry.status() != ReportStatus.PENDING) {
            return false;
        }

        List<ReportScreenshot> attachments = screenshots.findByReportIdOrderByOrdinal(reportId);
        RelayOutcome outcome = relay.relay(RelayEnvelope.of(entry, attachments));
        Instant now = Instant.now(clock);

        return switch (outcome.verdict()) {
            case DELIVERED -> {
                entry.markDelivered(now);
                screenshots.deleteByReportId(reportId);
                outbox.saveAndFlush(entry);
                log.info("Report delivered: reportId={} attempts={}", reportId, entry.attempts());
                yield true;
            }
            case REFUSED -> {
                entry.markDeadLettered(now, outcome.detail());
                outbox.saveAndFlush(entry);
                log.error(
                        "Report dead-lettered, worklog refused it permanently: reportId={} detail={}",
                        reportId,
                        outcome.detail());
                yield false;
            }
            case UNREACHABLE -> {
                entry.backOff(now, outcome.detail());
                outbox.saveAndFlush(entry);
                log.warn(
                        "Report delivery deferred: reportId={} attempts={} nextAttemptAt={} detail={}",
                        reportId,
                        entry.attempts(),
                        entry.nextAttemptAt(),
                        outcome.detail());
                yield false;
            }
        };
    }
}
