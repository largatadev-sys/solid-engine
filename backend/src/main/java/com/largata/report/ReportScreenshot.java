package com.largata.report;

import com.largata.common.id.UuidV7;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;


@Entity
@Table(name = "report_screenshot")
public class ReportScreenshot {

    @Id private UUID id;

    @Column(name = "report_id", nullable = false, updatable = false)
    private UUID reportId;

    @Column(nullable = false, updatable = false)
    private int ordinal;

    @Column(name = "content_type", nullable = false, updatable = false)
    private String contentType;

    @Column(nullable = false)
    private byte[] bytes;


    protected ReportScreenshot() {}


    private ReportScreenshot(UUID id, UUID reportId, int ordinal, String contentType, byte[] bytes) {
        this.id = id;
        this.reportId = reportId;
        this.ordinal = ordinal;
        this.contentType = contentType;
        this.bytes = bytes;
    }


    public static ReportScreenshot of(UUID reportId, int ordinal, String contentType, byte[] bytes) {
        return new ReportScreenshot(UuidV7.generate(), reportId, ordinal, contentType, bytes);
    }


    public UUID id() {
        return id;
    }

    public UUID reportId() {
        return reportId;
    }

    public int ordinal() {
        return ordinal;
    }

    public String contentType() {
        return contentType;
    }

    public byte[] bytes() {
        return bytes;
    }
}
