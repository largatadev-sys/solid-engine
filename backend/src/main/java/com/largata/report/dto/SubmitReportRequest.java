package com.largata.report.dto;


public record SubmitReportRequest(
        String reportId,
        String type,
        String description,
        String screen,
        String appVersion,
        String platform,
        String os,
        String browser,
        String deviceModel) {}
