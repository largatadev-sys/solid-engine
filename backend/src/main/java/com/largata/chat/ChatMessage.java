package com.largata.chat;

import com.largata.common.id.UuidV7;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;


@Entity
@Table(name = "chat_message")
class ChatMessage {

    static final int MAX_BODY_LENGTH = 2_000;

    @Id private UUID id;

    @Column(name = "itinerary_id", nullable = false, updatable = false)
    private UUID itineraryId;

    @Column(name = "author_traveler_id", nullable = false, updatable = false)
    private UUID authorTravelerId;

    @Column(nullable = false, updatable = false)
    private String body;

    @Column(name = "at", nullable = false, updatable = false)
    private Instant at;


    protected ChatMessage() {}


    private ChatMessage(UUID id, UUID itineraryId, UUID authorTravelerId, String body, Instant at) {
        this.id = id;
        this.itineraryId = itineraryId;
        this.authorTravelerId = authorTravelerId;
        this.body = body;
        this.at = at;
    }


    static ChatMessage appended(UUID itineraryId, UUID authorTravelerId, String body, Instant at) {
        if (itineraryId == null || authorTravelerId == null || at == null) {
            throw new IllegalArgumentException("A message belongs to a trip, has an author, and happens at a time");
        }
        return new ChatMessage(UuidV7.generate(), itineraryId, authorTravelerId, normalizeBody(body), at);
    }


    UUID id() {
        return id;
    }


    UUID itineraryId() {
        return itineraryId;
    }


    UUID authorTravelerId() {
        return authorTravelerId;
    }


    String body() {
        return body;
    }


    Instant at() {
        return at;
    }


    private static String normalizeBody(String body) {
        if (body == null || body.isBlank()) {
            throw new ChatExceptions.MessageBodyMissingException();
        }
        String stripped = body.strip();
        if (stripped.length() > MAX_BODY_LENGTH) {
            throw new ChatExceptions.MessageBodyTooLongException(MAX_BODY_LENGTH);
        }
        return stripped;
    }
}
