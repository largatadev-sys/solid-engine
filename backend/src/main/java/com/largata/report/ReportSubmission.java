package com.largata.report;

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
