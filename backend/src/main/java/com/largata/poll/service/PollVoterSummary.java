package com.largata.poll.service;

import java.util.UUID;


public record PollVoterSummary(UUID travelerId, String displayName, String avatarUrl, String handle) {}
