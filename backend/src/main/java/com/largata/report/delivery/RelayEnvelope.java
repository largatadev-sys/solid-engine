package com.largata.report.delivery;

import com.largata.report.outbox.DeviceContext;
import com.largata.report.outbox.ReportOutboxEntry;
import com.largata.report.outbox.ReportScreenshot;
import com.largata.report.outbox.ReportType;
import com.largata.report.outbox.Reporter;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record RelayEnvelope(
        UUID reportId,
        ReportType type,
        String description,
        String screen,
        String appVersion,
        String platform,
        DeviceContext device,
        Reporter reporter,
        Instant submittedAt,
        List<ReportScreenshot> screenshots) {

    static RelayEnvelope of(ReportOutboxEntry entry, List<ReportScreenshot> screenshots) {
        return new RelayEnvelope(
                entry.id(),
                entry.type(),
                entry.description(),
                entry.screen(),
                entry.appVersion(),
                entry.platform(),
                entry.device(),
                entry.reporterTravelerId() == null
                        ? null
                        : new Reporter(entry.reporterTravelerId(), entry.reporterName()),
                entry.submittedAt(),
                screenshots);
    }
}
