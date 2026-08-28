package com.largata.report;

import java.util.List;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;


@Component
class ReportInserter {

    private final ReportOutboxRepository outbox;
    private final ReportScreenshotRepository screenshots;

    ReportInserter(ReportOutboxRepository outbox, ReportScreenshotRepository screenshots) {
        this.outbox = outbox;
        this.screenshots = screenshots;
    }


    @Transactional(propagation = Propagation.REQUIRES_NEW)
    ReportOutboxEntry insert(ReportOutboxEntry entry, List<ReportScreenshot> attachments) {
        ReportOutboxEntry saved = outbox.saveAndFlush(entry);
        if (!attachments.isEmpty()) {
            screenshots.saveAllAndFlush(attachments);
        }
        return saved;
    }
}
