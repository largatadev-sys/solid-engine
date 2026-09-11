package com.largata.report.intake;

import com.largata.report.outbox.DeviceContext;
import com.largata.report.outbox.ReportType;
import com.largata.report.outbox.Reporter;
import java.util.List;
import java.util.UUID;

public record ReportSubmission(
        UUID reportId,
        ReportType type,
        String description,
        String screen,
        String appVersion,
        String platform,
        DeviceContext device,
        Reporter reporter,
        List<byte[]> screenshots) {}
