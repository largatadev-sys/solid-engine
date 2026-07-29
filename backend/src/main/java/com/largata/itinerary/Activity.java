package com.largata.itinerary;

import com.largata.common.id.UuidV7;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalTime;
import java.util.UUID;


@Entity
@Table(name = "activity")
class Activity {

    @Id private UUID id;


    @Column(name = "day_id", nullable = false)
    private UUID dayId;


    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @Column(nullable = false)
    private String title;


    @Column(name = "time_of_day")
    private LocalTime timeOfDay;


    @Column(name = "cost_amount")
    private BigDecimal costAmount;


    @Column(name = "cost_currency")
    private String costCurrency;


    @Column private String place;

    @Column private String description;


    @Column private String notes;


    @Column(name = "external_url")
    private String externalUrl;


    @Column(name = "last_edited_by", nullable = false)
    private UUID lastEditedBy;

    @Column(name = "last_edited_at", nullable = false)
    private Instant lastEditedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected Activity() {
    }

    private Activity(UUID id, UUID dayId, int sortOrder, ActivityFields fields, UUID editor, Instant at) {
        this.id = id;
        this.dayId = dayId;
        this.sortOrder = sortOrder;
        this.createdAt = at;
        apply(fields, editor, at);
    }


    static Activity create(UUID dayId, int sortOrder, ActivityFields fields, UUID editor, Instant at) {
        if (dayId == null || fields == null || editor == null || at == null) {
            throw new IllegalArgumentException("An activity belongs to a day, has fields, an editor and an instant");
        }
        return new Activity(UuidV7.generate(), dayId, sortOrder, fields, editor, at);
    }


    void edit(ActivityFields fields, UUID editor, Instant at) {
        apply(fields, editor, at);
    }


    void moveToDay(UUID newDayId, int newSortOrder) {
        this.dayId = newDayId;
        this.sortOrder = newSortOrder;
    }


    void reorderTo(int newSortOrder) {
        this.sortOrder = newSortOrder;
    }

    private void apply(ActivityFields fields, UUID editor, Instant at) {
        this.title = fields.title();
        this.timeOfDay = fields.timeOfDay();
        this.costAmount = fields.costAmount();
        this.costCurrency = fields.costCurrency();
        this.place = fields.place();
        this.description = fields.description();
        this.notes = fields.notes();
        this.externalUrl = fields.externalUrl();
        this.lastEditedBy = editor;
        this.lastEditedAt = at;
    }

    UUID id() {
        return id;
    }

    UUID dayId() {
        return dayId;
    }

    int sortOrder() {
        return sortOrder;
    }

    String title() {
        return title;
    }

    LocalTime timeOfDay() {
        return timeOfDay;
    }

    BigDecimal costAmount() {
        return costAmount;
    }

    String costCurrency() {
        return costCurrency;
    }

    String place() {
        return place;
    }

    String description() {
        return description;
    }

    String notes() {
        return notes;
    }

    String externalUrl() {
        return externalUrl;
    }

    UUID lastEditedBy() {
        return lastEditedBy;
    }

    Instant lastEditedAt() {
        return lastEditedAt;
    }

    Instant createdAt() {
        return createdAt;
    }
}
