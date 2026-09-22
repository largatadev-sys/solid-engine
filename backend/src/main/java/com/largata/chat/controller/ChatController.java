package com.largata.chat.controller;

import static com.largata.trip.room.Door.Rule.OPEN;

import com.largata.chat.dto.ChatMessageResponse;
import com.largata.chat.dto.SendMessageRequest;
import com.largata.chat.service.ChatService;
import com.largata.common.api.Page;
import com.largata.trip.room.CurrentMember;
import com.largata.trip.room.Door;
import com.largata.trip.room.Membership;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/trips/{itineraryId}/chat/messages")
class ChatController {

    private final ChatService chat;

    ChatController(ChatService chat) {
        this.chat = chat;
    }


    @PostMapping
    @Door(OPEN)
    @ResponseStatus(HttpStatus.CREATED)
    ChatMessageResponse send(@CurrentMember Membership member, @RequestBody SendMessageRequest request) {
        return ChatMessageResponse.of(chat.send(member, request.body()));
    }


    @GetMapping
    Page<ChatMessageResponse> thread(
            @CurrentMember Membership member,
            @RequestParam(required = false) String cursor,
            @RequestParam(required = false) Integer limit) {
        return chat.thread(member, cursor, limit).map(ChatMessageResponse::of);
    }
}
