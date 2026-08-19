package com.largata.poll;

import com.largata.common.id.UuidV7;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.util.UUID;


@Entity
@Table(name = "poll_option")
class PollOption {

    static final int MAX_LABEL_LENGTH = 80;

    @Id private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "poll_id", nullable = false, updatable = false)
    private Poll poll;

    @Column(nullable = false, updatable = false)
    private int ordinal;

    @Column(nullable = false, updatable = false)
    private String label;


    protected PollOption() {}


    private PollOption(UUID id, Poll poll, int ordinal, String label) {
        this.id = id;
        this.poll = poll;
        this.ordinal = ordinal;
        this.label = label;
    }


    static PollOption of(Poll poll, int ordinal, String label) {
        requireLabelWithinCap(label);
        return new PollOption(UuidV7.generate(), poll, ordinal, label);
    }


    static void requireLabelWithinCap(String label) {
        if (label.length() > MAX_LABEL_LENGTH) {
            throw new PollExceptions.OptionTooLongException(MAX_LABEL_LENGTH);
        }
    }


    UUID id() {
        return id;
    }

    int ordinal() {
        return ordinal;
    }

    String label() {
        return label;
    }
}
