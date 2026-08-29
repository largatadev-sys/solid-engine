package com.largata.report;

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
