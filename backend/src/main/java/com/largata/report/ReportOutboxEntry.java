package com.largata.report;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;


@Entity
@Table(name = "report_outbox")
public class ReportOutboxEntry {

    public static final Duration FIRST_BACKOFF = Duration.ofMinutes(1);
    public static final Duration MAX_BACKOFF = Duration.ofMinutes(15);

    @Id private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false)
    private ReportType type;

    @Column(nullable = false, updatable = false)
    private String description;

    @Column(updatable = false)
    private String screen;

    @Column(name = "app_version", updatable = false)
    private String appVersion;

    @Column(updatable = false)
    private String platform;

    @Column(name = "reporter_traveler_id", updatable = false)
    private UUID reporterTravelerId;

    @Column(name = "reporter_name", updatable = false)
    private String reporterName;

    @Column(name = "submitted_at", nullable = false, updatable = false)
    private Instant submittedAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ReportStatus status;

    @Column(nullable = false)
    private int attempts;

    @Column(name = "next_attempt_at", nullable = false)
    private Instant nextAttemptAt;

    @Column(name = "delivered_at")
    private Instant deliveredAt;

    @Column(name = "last_error")
    private String lastError;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;


    protected ReportOutboxEntry() {}


    public static ReportOutboxEntry accept(
            UUID reportId,
            ReportType type,
            String description,
            String screen,
            String appVersion,
            String platform,
            Reporter reporter,
            Instant submittedAt) {
        ReportOutboxEntry entry = new ReportOutboxEntry();
        entry.id = reportId;
        entry.type = type;
        entry.description = description;
        entry.screen = screen;
        entry.appVersion = appVersion;
        entry.platform = platform;
        entry.reporterTravelerId = reporter == null ? null : reporter.travelerId();
        entry.reporterName = reporter == null ? null : reporter.name();
        entry.submittedAt = submittedAt;
        entry.status = ReportStatus.PENDING;
        entry.attempts = 0;
        entry.nextAttemptAt = submittedAt;
        entry.createdAt = submittedAt;
        return entry;
    }


    public void markDelivered(Instant at) {
        this.status = ReportStatus.DELIVERED;
        this.deliveredAt = at;
        this.attempts = attempts + 1;
        this.lastError = null;
    }


    public void markDeadLettered(Instant at, String failure) {
        this.status = ReportStatus.DEAD_LETTER;
        this.attempts = attempts + 1;
        this.lastError = failure;
        this.nextAttemptAt = at;
    }


    public void backOff(Instant from, String failure) {
        this.attempts = attempts + 1;
        this.lastError = failure;
        this.nextAttemptAt = from.plus(backoffAfter(attempts));
    }


    static Duration backoffAfter(int attempts) {
        Duration grown = FIRST_BACKOFF.multipliedBy(1L << Math.min(attempts - 1, 30));
        return grown.compareTo(MAX_BACKOFF) > 0 ? MAX_BACKOFF : grown;
    }


    public UUID id() {
        return id;
    }

    public ReportType type() {
        return type;
    }

    public String description() {
        return description;
    }

    public String screen() {
        return screen;
    }

    public String appVersion() {
        return appVersion;
    }

    public String platform() {
        return platform;
    }

    public UUID reporterTravelerId() {
        return reporterTravelerId;
    }

    public String reporterName() {
        return reporterName;
    }

    public Instant submittedAt() {
        return submittedAt;
    }

    public ReportStatus status() {
        return status;
    }

    public int attempts() {
        return attempts;
    }

    public Instant nextAttemptAt() {
        return nextAttemptAt;
    }

    public Instant deliveredAt() {
        return deliveredAt;
    }

    public String lastError() {
        return lastError;
    }

    public Instant createdAt() {
        return createdAt;
    }
}
