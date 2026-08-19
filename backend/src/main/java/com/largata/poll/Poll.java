package com.largata.poll;

import com.largata.common.id.UuidV7;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;


@Entity
@Table(name = "poll")
class Poll {

    static final int MAX_QUESTION_LENGTH = 120;

    static final int MIN_OPTIONS = 2;

    static final int MAX_OPTIONS = 10;

    @Id private UUID id;

    @Column(name = "workspace_id", nullable = false, updatable = false)
    private UUID workspaceId;

    @Column(name = "created_by", nullable = false, updatable = false)
    private UUID createdBy;

    @Column(nullable = false, updatable = false)
    private String question;

    @Column(name = "closes_at", nullable = false, updatable = false)
    private Instant closesAt;

    @Column(name = "closed_at")
    private Instant closedAt;

    @Column(name = "closed_by")
    private UUID closedBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @OneToMany(mappedBy = "poll", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("ordinal ASC")
    private List<PollOption> options = new ArrayList<>();


    protected Poll() {}


    private Poll(UUID id, UUID workspaceId, UUID createdBy, String question, Instant closesAt, Instant at) {
        this.id = id;
        this.workspaceId = workspaceId;
        this.createdBy = createdBy;
        this.question = question;
        this.closesAt = closesAt;
        this.createdAt = at;
    }


    static Poll asked(
            UUID workspaceId, UUID createdBy, String question, List<String> optionLabels, Instant closesAt, Instant at) {
        if (workspaceId == null || createdBy == null || closesAt == null || at == null) {
            throw new IllegalArgumentException("A poll belongs to a workspace, is asked by a traveler, and closes");
        }
        Poll poll = new Poll(UuidV7.generate(), workspaceId, createdBy, normalizeQuestion(question), closesAt, at);
        List<String> labels = normalizeOptions(optionLabels);
        for (int ordinal = 0; ordinal < labels.size(); ordinal++) {
            poll.options.add(PollOption.of(poll, ordinal, labels.get(ordinal)));
        }
        return poll;
    }


    void closeEarly(UUID closerTravelerId, Instant at) {
        this.closedAt = at;
        this.closedBy = closerTravelerId;
    }


    boolean isClosedAt(Instant now) {
        return closedAt != null || !now.isBefore(closesAt);
    }


    boolean isAskedBy(UUID candidate) {
        return createdBy.equals(candidate);
    }


    private static String normalizeQuestion(String question) {
        if (question == null || question.isBlank()) {
            throw new PollExceptions.QuestionMissingException();
        }
        String stripped = question.strip();
        if (stripped.length() > MAX_QUESTION_LENGTH) {
            throw new PollExceptions.QuestionTooLongException(MAX_QUESTION_LENGTH);
        }
        return stripped;
    }


    private static List<String> normalizeOptions(List<String> labels) {
        List<String> sent = labels == null ? List.of() : labels;
        if (sent.size() > MAX_OPTIONS) {
            throw new PollExceptions.OptionCountOutOfRangeException(MIN_OPTIONS, MAX_OPTIONS);
        }
        List<String> stripped =
                sent.stream()
                        .map(label -> label == null ? "" : label.strip())
                        .filter(label -> !label.isEmpty())
                        .toList();
        if (stripped.size() < MIN_OPTIONS) {
            throw new PollExceptions.OptionCountOutOfRangeException(MIN_OPTIONS, MAX_OPTIONS);
        }
        stripped.forEach(PollOption::requireLabelWithinCap);
        return stripped;
    }


    UUID id() {
        return id;
    }

    UUID workspaceId() {
        return workspaceId;
    }

    UUID createdBy() {
        return createdBy;
    }

    String question() {
        return question;
    }

    Instant closesAt() {
        return closesAt;
    }

    Instant closedAt() {
        return closedAt;
    }

    UUID closedBy() {
        return closedBy;
    }

    Instant createdAt() {
        return createdAt;
    }

    List<PollOption> options() {
        return List.copyOf(options);
    }
}
