package com.largata.chat.web;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;


record SendMessageRequest(@NotBlank @Size(max = 2_000) String body) {}
