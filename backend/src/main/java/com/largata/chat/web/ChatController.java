package com.largata.chat.web;

import com.largata.chat.ChatService;
import com.largata.chat.api.ChatMessageResponse;
import com.largata.common.api.Page;
import com.largata.common.authz.AudienceFence;
import com.largata.common.authz.AuthorizationGuard;
import com.largata.common.authz.Membership;
import com.largata.identity.Traveler;
import com.largata.identity.web.CurrentTraveler;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;


@RestController
@RequestMapping("/v1/itineraries/{itineraryId}/chat/messages")
class ChatController {

    private final ChatService chat;
    private final AuthorizationGuard guard;
    private final AudienceFence audience;

    ChatController(ChatService chat, AuthorizationGuard guard, AudienceFence audience) {
        this.chat = chat;
        this.guard = guard;
        this.audience = audience;
    }


    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    ChatMessageResponse send(
            @CurrentTraveler Traveler traveler,
            @PathVariable UUID itineraryId,
            @Valid @RequestBody SendMessageRequest request) {
        Membership member = guard.requireMember(traveler.id(), itineraryId);
        return ChatMessageResponse.of(chat.send(member, request.body()));
    }


    @GetMapping
    Page<ChatMessageResponse> thread(
            @CurrentTraveler Traveler traveler,
            @PathVariable UUID itineraryId,
            @RequestParam(required = false) String cursor,
            @RequestParam(required = false) Integer limit) {
        Membership member = guard.requireMember(traveler.id(), itineraryId);
        return chat.thread(audience.requireInAudience(member), cursor, limit)
                .map(ChatMessageResponse::of);
    }
}
