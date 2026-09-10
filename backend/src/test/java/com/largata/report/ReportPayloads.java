package com.largata.report;

import java.util.UUID;


public final class ReportPayloads {

    private ReportPayloads() {}


    public static String reportJson(UUID reportId, String type, String description) {
        return reportJson(reportId, type, description, null);
    }


    public static String reportJson(UUID reportId, String type, String description, String extraFields) {
        return "{\"reportId\":\""
                + reportId
                + "\",\"type\":\""
                + type
                + "\",\"description\":\""
                + description
                + "\",\"appVersion\":\"0.1.0\",\"platform\":\"web\""
                + (extraFields == null ? "" : "," + extraFields)
                + "}";
    }
}
