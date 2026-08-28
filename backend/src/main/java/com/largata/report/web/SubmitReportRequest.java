package com.largata.report.web;


record SubmitReportRequest(
        String reportId,
        String type,
        String description,
        String screen,
        String appVersion,
        String platform) {}
