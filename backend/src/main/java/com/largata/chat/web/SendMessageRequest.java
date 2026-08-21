package com.largata.chat.web;

import com.largata.chat.api.ChatLimits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;


record SendMessageRequest(@NotBlank @Size(max = ChatLimits.MAX_BODY_LENGTH) String body) {}
