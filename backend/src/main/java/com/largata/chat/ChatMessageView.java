package com.largata.chat;

import com.largata.identity.TravelerSummary;
import java.time.Instant;
import java.util.UUID;


public record ChatMessageView(UUID id, TravelerSummary author, String body, Instant at) {}
