package com.largata.poll;

import java.util.UUID;


public record PollVoterSummary(UUID travelerId, String displayName, String avatarUrl, String handle) {}
