package com.largata.chat.api;

import com.largata.chat.ChatMessageView;
import com.largata.identity.TravelerSummary;
import java.time.Instant;
import java.util.UUID;


public record ChatMessageResponse(UUID id, ChatAuthorResponse author, String body, Instant at) {

    public static ChatMessageResponse of(ChatMessageView message) {
        return new ChatMessageResponse(
                message.id(), ChatAuthorResponse.of(message.author()), message.body(), message.at());
    }


    public record ChatAuthorResponse(
            UUID travelerId, String handle, String displayName, String avatarUrl) {

        static ChatAuthorResponse of(TravelerSummary author) {
            return author == null
                    ? null
                    : new ChatAuthorResponse(
                            author.id(), author.handle(), author.displayName(), author.avatarUrl());
        }
    }
}
