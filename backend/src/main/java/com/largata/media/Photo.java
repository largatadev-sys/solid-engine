package com.largata.media;

import com.largata.common.id.UuidV7;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;


@Entity
@Table(name = "photo")
public class Photo {

    @Id private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(name = "subject_kind", nullable = false, updatable = false)
    private PhotoSubject subjectKind;

    @Column(name = "subject_id", nullable = false, updatable = false)
    private UUID subjectId;

    @Column(name = "storage_key", nullable = false, updatable = false)
    private String storageKey;

    @Column(name = "content_type", nullable = false, updatable = false)
    private String contentType;

    @Column(nullable = false, updatable = false)
    private int width;

    @Column(nullable = false, updatable = false)
    private int height;

    @Column(name = "byte_size", nullable = false, updatable = false)
    private long byteSize;

    @Column(name = "uploaded_by", nullable = false, updatable = false)
    private UUID uploadedBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;


    protected Photo() {}


    private Photo(
            UUID id,
            PhotoSubject subjectKind,
            UUID subjectId,
            String storageKey,
            String contentType,
            int width,
            int height,
            long byteSize,
            UUID uploadedBy,
            Instant createdAt) {
        this.id = id;
        this.subjectKind = subjectKind;
        this.subjectId = subjectId;
        this.storageKey = storageKey;
        this.contentType = contentType;
        this.width = width;
        this.height = height;
        this.byteSize = byteSize;
        this.uploadedBy = uploadedBy;
        this.createdAt = createdAt;
    }


    public static Photo of(
            PhotoSubject subjectKind,
            UUID subjectId,
            IngestedImage image,
            UUID uploadedBy,
            Instant createdAt) {
        UUID id = UuidV7.generate();
        return new Photo(
                id,
                subjectKind,
                subjectId,
                storageKeyFor(id),
                image.contentType(),
                image.width(),
                image.height(),
                image.display().length,
                uploadedBy,
                createdAt);
    }


    static String storageKeyFor(UUID id) {
        return "photos/" + id;
    }


    public String thumbnailStorageKey() {
        return storageKey + THUMBNAIL_SUFFIX;
    }


    public UUID id() {
        return id;
    }

    public PhotoSubject subjectKind() {
        return subjectKind;
    }

    public UUID subjectId() {
        return subjectId;
    }

    public String storageKey() {
        return storageKey;
    }

    public String contentType() {
        return contentType;
    }

    public int width() {
        return width;
    }

    public int height() {
        return height;
    }

    public long byteSize() {
        return byteSize;
    }

    public UUID uploadedBy() {
        return uploadedBy;
    }

    public Instant createdAt() {
        return createdAt;
    }


    static final String THUMBNAIL_SUFFIX = "-thumb";
}
